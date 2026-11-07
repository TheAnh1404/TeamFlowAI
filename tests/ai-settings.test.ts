import {before,after,test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {randomBytes} from "node:crypto";
import {PGlite} from "@electric-sql/pglite";
import {drizzle} from "drizzle-orm/pglite";
import * as schema from "../src/server/db/schema";
import type {Database} from "../src/server/db/client";
import type {Session} from "../src/server/auth/contracts";
import {seedDemoUsers} from "../src/server/db/seed";
import {createAiSettingsService,withUserAiSettings} from "../src/features/ai-settings/server/service";
import {encryptApiKey,decryptApiKey} from "../src/features/ai-settings/server/crypto";
import {currentAiOverride} from "../src/server/ai/context";
import {isRealAiConfigured} from "../src/server/ai/real-provider";
import {HttpError} from "../src/server/http/errors";
import {AiUnavailableError} from "../src/server/ai/errors";
import type {AiProvider} from "../src/server/ai/contracts";
const pg=new PGlite(),db=drizzle(pg,{schema}) as unknown as Database,masterKey=randomBytes(32);
const firstKey="sk-test-first-secret-should-never-return",secondKey="sk-test-second-secret-should-never-return";
const originalEncryption=process.env.AI_SETTINGS_ENCRYPTION_KEY;
let first:Session,second:Session;
before(async()=>{
  process.env.AI_SETTINGS_ENCRYPTION_KEY=masterKey.toString("base64");
  const journal=JSON.parse(await readFile("drizzle/meta/_journal.json","utf8"));for(const entry of journal.entries)await pg.exec(await readFile(`drizzle/${entry.tag}.sql`,"utf8"));
  await seedDemoUsers(db);const users=await db.select().from(schema.users);
  first={user:users.find(u=>u.id==="demo-tv1")!,memberships:[]};second={user:users.find(u=>u.id==="demo-tv2")!,memberships:[]};
});
after(async()=>{await pg.close();if(originalEncryption===undefined)delete process.env.AI_SETTINGS_ENCRYPTION_KEY;else process.env.AI_SETTINGS_ENCRYPTION_KEY=originalEncryption;});
test("credential encryption is randomized, authenticated and bound to its owner",()=>{
  const encrypted=encryptApiKey(firstKey,"u1",masterKey);
  assert(!encrypted.includes(firstKey));assert.notEqual(encrypted,encryptApiKey(firstKey,"u1",masterKey));
  assert.equal(decryptApiKey(encrypted,"u1",masterKey),firstKey);
  assert.throws(()=>decryptApiKey(encrypted,"u2",masterKey),(e:unknown)=>e instanceof HttpError&&e.status===503);
  assert.throws(()=>decryptApiKey(encrypted,"u1",randomBytes(32)),(e:unknown)=>e instanceof HttpError&&e.status===503);
});
test("settings persist encrypted, never return the credential, and remain private per account",async()=>{
  const service=createAiSettingsService(db,{masterKey});
  await service.save(first,{mode:"real",model:"test-model",apiKey:firstKey});
  const state=await service.get(first);assert.equal(state.hasKey,true);assert(!JSON.stringify(state).includes(firstKey));
  const row=(await db.select().from(schema.userAiSettings))[0];assert(row.encryptedApiKey);assert(!JSON.stringify(row).includes(firstKey));
  assert.equal((await service.get(second)).hasKey,false);
  await service.save(first,{mode:"mock",model:"test-model"});assert.equal((await service.get(first)).hasKey,true);
  await service.save(second,{mode:"real",model:"second-model",apiKey:secondKey});
  await service.remove(first);assert.equal((await service.get(first)).hasKey,false);assert.equal((await service.get(second)).hasKey,true);
});
test("key checks classify failures without reflecting provider secrets and distinguish authentication from model access",async()=>{
  const rejected=createAiSettingsService(db,{masterKey,fetcher:async()=>Response.json({error:{message:firstKey}},{status:401})});
  const bad=await rejected.check(first,{apiKey:firstKey,model:"test-model",test:"key"});assert.equal(bad.code,"INVALID_KEY");assert(!JSON.stringify(bad).includes(firstKey));
  const accepted=createAiSettingsService(db,{masterKey,fetcher:async(_url,init)=>{assert.equal((init?.headers as Record<string,string>).Authorization,`Bearer ${firstKey}`);return Response.json({data:[{id:"test-model"}]});}});
  const good=await accepted.check(first,{apiKey:firstKey,model:"test-model",test:"key"});assert(good.ok);assert.equal(good.modelAvailable,true);assert.equal(good.agents.length,0);
  const unavailable=await accepted.check(first,{apiKey:firstKey,model:"not-granted",test:"key"});assert.equal(unavailable.code,"MODEL_NOT_AVAILABLE");assert.equal(unavailable.ok,false);
});
test("stored real settings override rehearsal mode per asynchronous request without leaking across users",async()=>{
  const service=createAiSettingsService(db,{masterKey});await service.save(first,{mode:"real",model:"first-model",apiKey:firstKey});
  const previousForce=process.env.AI_FORCE_MOCK;process.env.AI_FORCE_MOCK="true";
  try{
  const observed=await Promise.all([withUserAiSettings(db,first,async()=>{await new Promise(r=>setTimeout(r,5));assert(isRealAiConfigured());return currentAiOverride();}),withUserAiSettings(db,second,async()=>{await new Promise(r=>setTimeout(r,1));return currentAiOverride();})]);
  assert.equal(observed[0]?.apiKey,firstKey);assert.equal(observed[1]?.apiKey,secondKey);assert.equal(currentAiOverride(),undefined);
  }finally{if(previousForce===undefined)delete process.env.AI_FORCE_MOCK;else process.env.AI_FORCE_MOCK=previousForce;}
});
test("agent probe uses the candidate key/model, synthetic input and explicit real mode; no mock success",async()=>{
  const probe={async generate(kind:string,input:unknown){assert.equal(currentAiOverride()?.apiKey,firstKey);assert.equal(currentAiOverride()?.model,"test-model");assert.equal(currentAiOverride()?.maxOutputTokens,2048);assert(!JSON.stringify(input).includes("private-project"));if(kind==="reviewer")throw new AiUnavailableError("upstream message",undefined,429);
    const proposal=kind==="planner"?{tasks:[{tempKey:"one",title:"Test",description:"Test",assigneeMemberId:"probe-member",deadline:new Date().toISOString(),criteria:["Có bằng chứng"],dependencyTempKeys:[],steps:["Đọc yêu cầu"],assignmentReason:"Có kỹ năng tài liệu",estimatedHours:1}]}:kind==="coordinator"?{intent:"discussion"}:[{text:"Chưa có dữ liệu",sourceRefs:[],metricKeys:["statusCounts"]}];
    return {proposal,aiMode:"real"};}} as AiProvider;
  const service=createAiSettingsService(db,{masterKey,probe});const result=await service.check(first,{apiKey:firstKey,model:"test-model",test:"agents"});
  assert.equal(result.agents.length,4);assert.equal(result.ok,false);assert.equal(result.agents.find(a=>a.agent==="reviewer")?.code,"RATE_LIMIT_OR_QUOTA");assert(!JSON.stringify(result).includes(firstKey));
});
