import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import env from "@next/env";
import { neon } from "@neondatabase/serverless";
import { hashSessionToken } from "../src/server/auth/credentials.ts";
import { mutationIdentity } from "../src/server/db/idempotency-key.ts";

env.loadEnvConfig(process.cwd());
const base = new URL(process.env.TV2_TEST_BASE_URL ?? "http://localhost:3000");
if (!["localhost", "127.0.0.1"].includes(base.hostname)) throw new Error("Integration checks only target a local server.");
if (!process.env.DATABASE_URL) throw new Error("Cần cấu hình Neon.");
if ((process.env.COORDINATOR_MODE ?? "mock") !== "mock") throw new Error("Bộ kiểm tra quy tắc demo cần COORDINATOR_MODE=mock.");
const connection = neon(process.env.DATABASE_URL);
const sql = {
  query: (text, params) => connection.query(text, params, { fetchOptions: { signal: AbortSignal.timeout(15000) } }),
  transaction: queries => connection.transaction(queries, { fetchOptions: { signal: AbortSignal.timeout(15000) } }),
};
const p = randomUUID(), privateProject = randomUUID(), pl = randomUUID(), privatePlan = randomUUID();
const m1 = randomUUID(), m2 = randomUUID(), m3 = randomUUID(), privateMember = randomUUID();
const t1 = randomUUID(), t2 = randomUUID(), t3 = randomUUID(), privateTask = randomUUID();
const submission = randomUUID();
const deadline = new Date(Date.now() + 86400000).toISOString();
const criteria = [{ id: randomUUID(), text: "Tiêu chí kiểm thử tracking, không phải bài nộp sản phẩm." }];
const tasks = [
  { id: t1, title: "Kiểm thử cập nhật đúng task", description: "Fixture tích hợp TV2.", assigneeMemberId: m2, deadline, criteria, dependencyTaskIds: [] },
  { id: t2, title: "Kiểm thử quyền người khác", description: "Fixture tích hợp TV2.", assigneeMemberId: m3, deadline, criteria, dependencyTaskIds: [] },
  { id: t3, title: "Kiểm thử trạng thái chờ nghiệm thu", description: "Fixture tích hợp TV2.", assigneeMemberId: m2, deadline, criteria, dependencyTaskIds: [] },
];
const privateDraft = { ...tasks[0], id: privateTask, assigneeMemberId: privateMember };
const jars = new Map();
const tokenHashes = [];
const scopes = new Set();
let successful = 0;
let activeCheck = "Chuẩn bị dữ liệu kiểm thử";
fs.mkdirSync(".cache/tv2", { recursive: true });
const manifest = ".cache/tv2/integration-" + p + ".json";
function persistCleanup(cleaned = false) {
  fs.writeFileSync(manifest, JSON.stringify({ owner: "teamflow-tv2-integration", projectIds: [p, privateProject], scopes: [...scopes], sessionHashes: tokenHashes, cleaned }, null, 2));
}
persistCleanup();

async function request(path, { method = "GET", body, account = "TV2", key, origin = base.origin } = {}) {
  const headers = { Origin: origin };
  if (jars.has(account)) headers.Cookie = jars.get(account);
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (key) {
    headers["Idempotency-Key"] = key;
    scopes.add(mutationIdentity("demo-" + account.toLowerCase(), method + " " + path, key, body).scope);
    persistCleanup();
  }
  const response = await fetch(new URL(path, base), { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const payload = await response.json();
  return { status: response.status, payload, cookie: response.headers.get("set-cookie")?.split(";")[0] };
}
async function check(label, work) {
  activeCheck = label;
  await work();
  successful++;
  console.log("OK " + label);
}
async function getTask() {
  const result = await request("/api/tasks/" + t1);
  assert.equal(result.status, 200);
  return result.payload.data;
}
async function message(body, options = {}) {
  return request("/api/projects/" + p + "/messages", { method: "POST", body, key: randomUUID(), ...options });
}
async function setup() {
  const inserts = [];
  for (const id of [p, privateProject]) inserts.push(sql.query(
    "insert into projects (id,name,goal,deliverables,deadline,time_zone) values ($1,$2,$3,$4,$5,$6)",
    [id, "[Kiểm thử TV2] " + id, "Fixture tạm, không phải dự án do Planner tạo.", ["Kiểm tra tracking"], deadline, "Asia/Ho_Chi_Minh"]
  ));
  for (const [id, projectId, userId, role, canAccept] of [
    [m1,p,"demo-tv1","leader",true], [m2,p,"demo-tv2","member",false], [m3,p,"demo-tv3","member",true],
    [privateMember,privateProject,"demo-tv1","leader",true],
  ]) inserts.push(sql.query("insert into project_members (id,project_id,user_id,role,can_accept,skills,available_hours_per_week) values ($1,$2,$3,$4,$5,$6,$7)", [id, projectId, userId, role, canAccept, [], 8]));
  inserts.push(sql.query("insert into plans (id,project_id,status,version,draft_tasks,ai_mode,approved_by_member_id,published_at) values ($1,$2,'published',1,$3,'mock',$4,now())", [pl,p,JSON.stringify(tasks),m1]));
  inserts.push(sql.query("insert into plans (id,project_id,status,version,draft_tasks,ai_mode,approved_by_member_id,published_at) values ($1,$2,'published',1,$3,'mock',$4,now())", [privatePlan,privateProject,JSON.stringify([privateDraft]),privateMember]));
  for (const task of [...tasks, privateDraft]) inserts.push(sql.query(
    "insert into tasks (id,project_id,plan_id,title,description,assignee_member_id,deadline,criteria,dependency_task_ids,status,version) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1)",
    [task.id, task.id === privateTask ? privateProject : p, task.id === privateTask ? privatePlan : pl, task.title, task.description, task.assigneeMemberId, deadline, JSON.stringify(criteria), [], task.id === t3 ? "in_review" : "todo"]
  ));
  inserts.push(sql.query("insert into submissions (id,project_id,task_id,author_member_id,revision,content_type,content,criteria_snapshot) values ($1,$2,$3,$4,1,'text',$5,$6)", [submission,p,t3,m2,"Fixture kiểm thử trạng thái.",JSON.stringify(criteria)]));
  await sql.transaction(inserts);
}
async function cleanup() {
  const existing = await sql.query("select id, name from projects where id = any($1::text[])", [[p, privateProject]]);
  if (existing.some(row => row.name !== "[Kiểm thử TV2] " + row.id)) throw new Error("Refusing to delete a project that is not this run's fixture.");
  const commands = [];
  if (scopes.size) commands.push(sql.query("delete from mutation_requests where scope = any($1::text[])", [[...scopes]]));
  if (tokenHashes.length) commands.push(sql.query("delete from sessions where token_hash = any($1::text[])", [tokenHashes]));
  for (const table of ["progress_updates","messages","reviews","submissions","weekly_reports","tasks","plans","project_members","projects"]) {
    const field = table === "projects" ? "id" : "project_id";
    commands.push(sql.query("delete from " + table + " where " + field + " = any($1::text[])", [[p,privateProject]]));
  }
  await sql.transaction(commands);
}

try {
  const health = await fetch(new URL("/api/health", base), { signal: AbortSignal.timeout(10000) });
  const identity = await health.json();
  assert.equal(identity.app, "TeamFlow AI", "Expected local TeamFlow AI server.");
  await setup();
  await check("không có session bị chặn", async () => {
    assert.equal((await request("/api/projects/" + p + "/tasks")).status, 401);
  });
  await check("client tự khai role/userId không tạo session", async () => {
    const result = await request("/api/session", { method:"POST", body:{demoAccount:"TV2",userId:"demo-tv1",role:"leader"} });
    assert.equal(result.status,422);
  });
  for (const account of ["TV2","TV3"]) {
    const result = await request("/api/session", { method:"POST", account, body:{demoAccount:account} });
    assert.equal(result.status,200);
    assert.ok(result.cookie);
    jars.set(account,result.cookie);
    tokenHashes.push(hashSessionToken(result.cookie.slice(result.cookie.indexOf("=")+1)));
    persistCleanup();
  }
  await check("đọc task/member/user trên cùng project", async () => {
    const result = await request("/api/projects/" + p + "/tasks");
    assert.equal(result.status,200); assert.equal(result.payload.data.length,3);
    assert.equal((await request("/api/projects/" + p + "/members")).payload.data.length,3);
    assert.equal((await request("/api/users")).status,200);
  });
  await check("không đọc được project/task ngoài membership", async () => {
    assert.equal((await request("/api/projects/" + privateProject + "/tasks")).status,404);
    assert.equal((await request("/api/tasks/" + privateTask)).status,404);
    assert.equal((await message({content:"Tôi đang làm",taskId:privateTask})).status,422);
  });
  await check("Origin khác bị chặn", async () => {
    assert.equal((await message({content:"Tôi đang làm",taskId:t1},{origin:"https://invalid.example"})).status,403);
  });
  let first, firstBody = {content:"Tôi bắt đầu làm",taskId:t1}, firstKey=randomUUID();
  await check("chat rõ ý đổi đúng task và lưu nguồn", async () => {
    first = await message(firstBody,{key:firstKey});
    assert.equal(first.status,200);
    assert.equal(first.payload.data.message.aiMode,"mock");
    assert.equal(first.payload.data.task.status,"in_progress");
    assert.equal(first.payload.data.progressUpdate.messageId,first.payload.data.message.id);
    const list = await request("/api/projects/" + p + "/tasks");
    assert.equal(list.payload.data.find(task=>task.id===t1).latestProgressUpdate.messageId,first.payload.data.message.id);
  });
  await check("retry cùng key trả bản cũ, khác body báo conflict", async () => {
    const replay = await message(firstBody,{key:firstKey});
    assert.equal(replay.status,200);
    assert.equal(replay.payload.data.message.id,first.payload.data.message.id);
    assert.equal((await message({content:"Nội dung khác",taskId:t1},{key:firstKey})).status,409);
  });
  await check("người không phụ trách chỉ lưu trao đổi", async () => {
    const result = await message({content:"Tôi đang bị chặn vì thiếu dữ liệu",taskId:t1},{account:"TV3"});
    assert.equal(result.status,200);
    assert.equal(result.payload.data.message.resolution,"no_change");
    assert.equal(result.payload.data.progressUpdate,null);
    assert.equal((await getTask()).status,"in_progress");
  });
  let ambiguous;
  await check("chat mơ hồ chưa ghi ProgressUpdate", async () => {
    ambiguous = await message({content:"Phần đó đang bị chặn"});
    assert.equal(ambiguous.status,200);
    assert.equal(ambiguous.payload.data.message.resolution,"clarification_required");
    assert.equal(ambiguous.payload.data.progressUpdate,null);
    assert.equal((await getTask()).version,2);
  });
  const resolvePath = "/api/messages/" + ambiguous.payload.data.message.id + "/resolve";
  const resolveBody = {taskId:t1,requestedStatus:"blocked",blocker:"Thiếu tài liệu kiểm thử",expectedTaskVersion:2};
  await check("tác giả/quyền/version được kiểm tra khi làm rõ", async () => {
    assert.equal((await request(resolvePath,{method:"POST",body:resolveBody,key:randomUUID(),account:"TV3"})).status,403);
    assert.equal((await request(resolvePath,{method:"POST",body:{...resolveBody,expectedTaskVersion:1},key:randomUUID()})).status,409);
    assert.equal((await request(resolvePath,{method:"POST",body:{...resolveBody,blocker:""},key:randomUUID()})).status,422);
  });
  await check("hai xác nhận đồng thời chỉ tạo một cập nhật", async () => {
    const keys = [randomUUID(),randomUUID()];
    const results = await Promise.all(keys.map(key=>request(resolvePath,{method:"POST",body:resolveBody,key})));
    assert.deepEqual(results.map(result=>result.status).sort(),[200,409]);
    const winner = results.findIndex(result=>result.status===200);
    const replay = await request(resolvePath,{method:"POST",body:resolveBody,key:keys[winner]});
    assert.equal(replay.status,200);
    assert.equal(replay.payload.data.progressUpdate.id,results[winner].payload.data.progressUpdate.id);
    assert.equal((await getTask()).status,"blocked");
    const list = await request("/api/projects/" + p + "/tasks");
    assert.equal(list.payload.data.find(task=>task.id===t1).latestProgressUpdate.blocker,resolveBody.blocker);
  });
  await check("reload đọc lại dữ liệu Neon, không trùng bản ghi", async () => {
    const result = await request("/api/tasks/" + t1 + "/progress-updates");
    assert.equal(result.status,200); assert.equal(result.payload.data.length,2);
    assert.equal((await getTask()).version,3);
  });
  await check("gần xong/đổi deadline không làm sai trạng thái hoặc tiêu chí", async () => {
    assert.equal((await message({content:"Gần xong rồi",taskId:t1})).payload.data.message.resolution,"clarification_required");
    assert.equal((await message({content:"Đổi deadline sang mai",taskId:t1})).payload.data.message.resolution,"no_change");
    const current = await getTask();
    assert.equal(current.status,"blocked");
    assert.deepEqual(current.criteria,criteria);
    assert.equal(current.assigneeMemberId,m2);
    assert.equal(current.deadline,deadline);
  });
  await check("chat không đổi task đang in_review", async () => {
    const result = await message({content:"Tôi đang làm",taskId:t3});
    assert.equal(result.payload.data.message.resolution,"no_change");
    assert.equal((await request("/api/tasks/"+t3)).payload.data.status,"in_review");
  });
  await check("thiếu key hoặc chèn field role bị từ chối", async () => {
    assert.equal((await request("/api/projects/"+p+"/messages",{method:"POST",body:{content:"Tôi đang làm"}})).status,422);
    assert.equal((await message({content:"Tôi đang làm",taskId:t1,role:"leader"})).status,422);
  });
  await check("task của Plan draft không được công bố qua reader", async () => {
    await sql.query("update plans set status='draft', approved_by_member_id=null, published_at=null where id=$1",[pl]);
    assert.equal((await request("/api/projects/"+p+"/tasks")).payload.data.length,0);
    assert.equal((await request("/api/tasks/"+t1)).status,404);
  });
  console.log("Đạt " + successful + " kiểm tra tích hợp API/Neon với fixture tạm.");
} catch (error) {
  console.error("Chưa đạt kiểm tra: " + activeCheck);
  if (error instanceof assert.AssertionError) console.error(error.message);
  process.exitCode = 1;
} finally {
  try {
    await cleanup();
    persistCleanup(true);
    console.log("Đã dọn đúng hai project kiểm thử, session và key do lượt chạy này tạo; giữ nguyên dữ liệu khác.");
  } catch {
    console.error("Dọn fixture chưa thành công. Manifest trong .cache/tv2 giữ đúng ID cần dọn; không reset database.");
    process.exitCode = 1;
  }
}
