import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import * as schema from "../src/server/db/schema";
import type { Database } from "../src/server/db/client";
import type { Session } from "../src/server/auth/contracts";
import type { AiProvider, ReportAiInput } from "../src/server/ai/contracts";
import type { Submission } from "../src/contracts";
import { seedDemoUsers } from "../src/server/db/seed";
import { createPlanningService } from "../src/features/planning/server/implementation";
import { createPlanner } from "../src/features/planning/server/planner";
import { createDeliveryService } from "../src/features/delivery/server/implementation";
import { HttpError } from "../src/server/http/errors";
import { createSupervisionService, scanDeadlineRisks } from "../src/features/supervision/server/service";

const pg = new PGlite();
const db = drizzle(pg, {schema}) as unknown as Database;
let leader: Session, worker: Session, outsider: Session;
const key = () => ({idempotencyKey: crypto.randomUUID()});
const code = (value: string) => (e: unknown) => e instanceof HttpError && e.code === value;
const provider = {
  async generate(kind: string, input: {submission: Submission} & ReportAiInput) {
    if (kind === "reviewer") return {aiMode: "mock", proposal: {results: input.submission.criteriaSnapshot.map(c => ({criterionId:c.id,verdict:"met",evidence:[{submissionId:input.submission.id,quote:input.submission.content}],missing:"",suggestion:""})),summary:"Bằng chứng đã được đối chiếu; chờ người có quyền nghiệm thu."}};
    if (kind === "weekly_report") return {aiMode:"mock",proposal:[{text:`Đã ghi nhận ${input.metrics.submissionsInPeriodTotal} lượt nộp.`,sourceRefs:input.sourceRefs.slice(0,1),metricKeys:["submissionsInPeriodTotal"]}]};
    throw Error("unexpected kind");
  },
} as AiProvider;
const delivery = createDeliveryService(db, provider);
before(async () => {
  const journal = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8"));
  for (const entry of journal.entries) await pg.exec(await readFile(`drizzle/${entry.tag}.sql`, "utf8"));
  await seedDemoUsers(db);
  const users = await db.select().from(schema.users);
  const session = (id: string): Session => ({user:users.find(u=>u.id===id)!,memberships:[]});
  leader = session("demo-tv1"); worker = session("demo-tv2"); outsider = session("demo-tv3");
});
after(async () => { await pg.close(); });
async function publishedTask() {
  const planning = createPlanningService(db, createPlanner(undefined,"mock"));
  const result = await planning.createProject(leader,{name:"Stage demo",goal:"Verify persisted workflow",deliverables:["API demo"],deadline:new Date(Date.now()+86400000).toISOString(),timeZone:"Asia/Ho_Chi_Minh"});
  await planning.updateProjectMember(leader,result.project.id,result.member.id,{skills:["Planning"],availableHoursPerWeek:10});
  const member = await planning.addProjectMember(leader,result.project.id,{userId:worker.user.id,skills:["API"],availableHoursPerWeek:10,canAccept:false});
  const draft = await planning.generatePlanDraft(leader,result.project.id);
  const edited = await planning.updatePlanDraft(leader,draft.id,{expectedVersion:draft.version,draftTasks:draft.draftTasks.map(t=>({...t,assigneeMemberId:member.id}))});
  return (await planning.publishPlan(leader,draft.id,{expectedVersion:edited.version,approved:true},key())).tasks[0];
}
test("one persisted workflow: publish, submit, review, human acceptance, report and reload", async () => {
  const task = await publishedTask();
  const input = {expectedTaskVersion:task.version,contentType:"markdown" as const,content:"API demo: tài liệu, kiểm thử và hướng dẫn sử dụng có bằng chứng."};
  const options = key();
  const submitted = await delivery.submitWork(worker,task.id,input,options);
  assert.equal(submitted.task.status,"in_review");
  assert.deepEqual(await delivery.submitWork(worker,task.id,input,options),submitted);
  await assert.rejects(delivery.submitWork(worker,task.id,{...input,content:"different"},options),code("IDEMPOTENCY_CONFLICT"));
  const reviewed = await delivery.requestReview(worker,submitted.submission.id,key());
  assert.equal(reviewed.task.status,"in_review");
  await assert.rejects(delivery.confirmAcceptance(worker,task.id,{submissionId:submitted.submission.id,expectedTaskVersion:reviewed.task.version},key()),code("FORBIDDEN"));
  const accepted = await delivery.confirmAcceptance(leader,task.id,{submissionId:submitted.submission.id,expectedTaskVersion:reviewed.task.version},key());
  assert.equal(accepted.status,"done");
  const report = await delivery.generateWeeklyReport(leader,task.projectId,{periodStart:new Date(Date.now()-86400000).toISOString(),periodEnd:new Date().toISOString()},key());
  assert.equal(report.metrics.statusCounts.done,1);
  assert.equal(report.metrics.submissionsInPeriodTotal,1);
  const restarted = createDeliveryService(db,provider);
  assert.deepEqual((await restarted.listSubmissions(worker,task.id))[0],submitted.submission);
  assert.deepEqual(await restarted.getReport(worker,report.id),report);
  assert((await db.select().from(schema.tasks).where(eq(schema.tasks.id,task.id)))[0].acceptedAt);
});
test("resource access is checked before replay, even with forged cached memberships", async () => {
  const task = await publishedTask(), options=key();
  const input={expectedTaskVersion:task.version,contentType:"text" as const,content:"Evidence"};
  const submitted=await delivery.submitWork(worker,task.id,input,options);
  await assert.rejects(delivery.submitWork(outsider,task.id,input,options),code("NOT_FOUND"));
  await assert.rejects(delivery.listSubmissions(outsider,task.id),code("NOT_FOUND"));
  await assert.rejects(delivery.getReview(outsider,submitted.submission.id),code("NOT_FOUND"));
  await db.update(schema.projectMembers).set({role:"member",canAccept:false}).where(eq(schema.projectMembers.userId,worker.user.id));
  const forged={...worker,memberships:[{id:"fake",projectId:task.projectId,userId:worker.user.id,role:"leader" as const,canAccept:true,skills:[],availableHoursPerWeek:10}]};
  await assert.rejects(delivery.confirmAcceptance(forged,task.id,{submissionId:submitted.submission.id,expectedTaskVersion:submitted.task.version},key()),code("FORBIDDEN"));
});
test("latest revision only; a review finishing on an older revision never changes the current task", async () => {
  const task=await publishedTask();
  const first=await delivery.submitWork(worker,task.id,{contentType:"text",content:"First evidence",expectedTaskVersion:task.version},key());
  let second: Awaited<ReturnType<typeof delivery.submitWork>> | undefined;
  const delayed=createDeliveryService(db,{async generate(kind,input){
    second=await delivery.submitWork(worker,task.id,{contentType:"text",content:"Second evidence",expectedTaskVersion:first.task.version},key());
    return provider.generate(kind,input);
  }});
  const reviewed=await delayed.requestReview(worker,first.submission.id,key());
  assert.equal(reviewed.task.version,second!.task.version);
  await assert.rejects(delivery.confirmAcceptance(leader,task.id,{submissionId:first.submission.id,expectedTaskVersion:second!.task.version},key()),code("VALIDATION_ERROR"));
  assert.equal((await delivery.listSubmissions(worker,task.id)).length,2);
  assert(await delivery.getReview(worker,first.submission.id));
});
test("AI failure or fabricated evidence cannot mutate task/review or leave partial data", async () => {
  const task=await publishedTask();
  const submitted=await delivery.submitWork(worker,task.id,{contentType:"text",content:"Actual evidence",expectedTaskVersion:task.version},key());
  const bad=createDeliveryService(db,{async generate(){throw new Error("provider unavailable");}});
  await assert.rejects(bad.requestReview(worker,submitted.submission.id,key()));
  assert.equal(await delivery.getReview(worker,submitted.submission.id),null);
  const fabricated=createDeliveryService(db,{async generate(kind,input){const r=await provider.generate(kind,input);if(kind==="reviewer") (r.proposal as {results:{evidence:{submissionId:string}[]}[]}).results[0].evidence[0].submissionId="wrong-submission";return r;}});
  await assert.rejects(fabricated.requestReview(worker,submitted.submission.id,key()));
  assert.equal(await delivery.getReview(worker,submitted.submission.id),null);
  assert.equal((await db.select().from(schema.tasks).where(eq(schema.tasks.id,task.id)))[0].version,submitted.task.version);
});

test("missing, duplicate or foreign criteria and invented quotes never persist a review", async () => {
  const task=await publishedTask();
  const submitted=await delivery.submitWork(worker,task.id,{contentType:"text",content:"Actual evidence",expectedTaskVersion:task.version},key());
  for(const corrupt of [
    (results: {criterionId:string;evidence:{quote:string}[]}[])=>results.pop(),
    (results: {criterionId:string;evidence:{quote:string}[]}[])=>results.push(results[0]),
    (results: {criterionId:string;evidence:{quote:string}[]}[])=>{results[0].criterionId="foreign-criterion";},
    (results: {criterionId:string;evidence:{quote:string}[]}[])=>{results[0].evidence[0].quote="invented quote";},
  ]) {
    const invalid=createDeliveryService(db,{async generate(kind,input){
      const result=await provider.generate(kind,input);
      corrupt((result.proposal as {results:{criterionId:string;evidence:{quote:string}[]}[]}).results);
      return result;
    }});
    await assert.rejects(invalid.requestReview(worker,submitted.submission.id,key()));
    assert.equal(await delivery.getReview(worker,submitted.submission.id),null);
  }
});

test("insufficient evidence blocks acceptance; review retries and concurrent requests keep one immutable review", async () => {
  const task=await publishedTask();
  const submitted=await delivery.submitWork(worker,task.id,{contentType:"text",content:"Incomplete evidence",expectedTaskVersion:task.version},key());
  const incomplete=createDeliveryService(db,{async generate(){return {aiMode:"mock",proposal:{summary:"Cần thêm bằng chứng.",results:submitted.submission.criteriaSnapshot.map(c=>({criterionId:c.id,verdict:"insufficient_evidence",evidence:[],missing:"Chưa có bằng chứng.",suggestion:"Nộp lại bằng chứng."}))}};} } as AiProvider);
  const [a,b]=await Promise.all([incomplete.requestReview(worker,submitted.submission.id,key()),incomplete.requestReview(worker,submitted.submission.id,key())]);
  assert.equal(a.review.id,b.review.id);
  assert.equal((await db.select().from(schema.reviews).where(eq(schema.reviews.submissionId,submitted.submission.id))).length,1);
  const replayed=await delivery.requestReview(worker,submitted.submission.id,key());assert.deepEqual(replayed.review,a.review);
  await assert.rejects(delivery.confirmAcceptance(leader,task.id,{submissionId:submitted.submission.id,expectedTaskVersion:a.task.version},key()),code("VALIDATION_ERROR"));
  assert.equal((await db.select().from(schema.tasks).where(eq(schema.tasks.id,task.id)))[0].status,"in_review");
});

test("leader-only report snapshots survive task changes and retry without regenerating AI", async () => {
  const task=await publishedTask();
  const submitted=await delivery.submitWork(worker,task.id,{contentType:"text",content:"Actual evidence",expectedTaskVersion:task.version},key());
  const reviewed=await delivery.requestReview(worker,submitted.submission.id,key());
  const period={periodStart:new Date(Date.now()-86400000).toISOString(),periodEnd:new Date().toISOString()};
  await assert.rejects(delivery.generateWeeklyReport(worker,task.projectId,period,key()),code("FORBIDDEN"));
  let calls=0;
  const reporting=createDeliveryService(db,{async generate(kind,input){calls++;return provider.generate(kind,input);}});
  const options=key(),report=await reporting.generateWeeklyReport(leader,task.projectId,period,options);
  assert.equal(report.metrics.statusCounts.done,0);assert.equal(report.metrics.statusCounts.in_review,1);
  await delivery.confirmAcceptance(leader,task.id,{submissionId:submitted.submission.id,expectedTaskVersion:reviewed.task.version},key());
  assert.deepEqual(await reporting.generateWeeklyReport(leader,task.projectId,period,options),report);assert.equal(calls,1);
  assert.deepEqual(await delivery.getReport(worker,report.id),report);
  await assert.rejects(delivery.getReport(outsider,report.id),code("NOT_FOUND"));
  const invalid=createDeliveryService(db,{async generate(){return {aiMode:"mock",proposal:[{text:"Nguồn giả",sourceRefs:[{entity:"Submission",id:"foreign-submission"}],metricKeys:[]}]};}} as AiProvider);
  await assert.rejects(invalid.generateWeeklyReport(leader,task.projectId,period,key()));
  assert.equal((await delivery.listReports(leader,task.projectId)).length,1);
});

test("mentor grants are read-only; 80% deadline notifications persist once per recipient and revoke safely", async () => {
  const task=await publishedTask(), supervision=createSupervisionService(db);
  await assert.rejects(supervision.overview(outsider,task.projectId),code("NOT_FOUND"));
  await assert.rejects(supervision.grantMentor(worker,task.projectId,outsider.user.id),code("FORBIDDEN"));
  const grant=await supervision.grantMentor(leader,task.projectId,outsider.user.id);
  assert.equal((await supervision.grantMentor(leader,task.projectId,outsider.user.id)).id,grant.id);
  assert.equal((await supervision.overview(outsider,task.projectId)).readOnly,true);
  await assert.rejects(delivery.submitWork(outsider,task.id,{expectedTaskVersion:task.version,contentType:"text",content:"Mentor cannot submit"},key()),code("NOT_FOUND"));
  const [project]=await db.select().from(schema.projects).where(eq(schema.projects.id,task.projectId));
  const boundary=Date.parse(project.createdAt)+(Date.parse(project.deadline)-Date.parse(project.createdAt))*.8;
  const at=new Date(Math.ceil(boundary)).toISOString();
  await scanDeadlineRisks(db,()=>new Date(Math.ceil(boundary)-1).toISOString());
  assert.equal((await db.select().from(schema.notifications).where(eq(schema.notifications.projectId,task.projectId))).length,0);
  await scanDeadlineRisks(db,()=>at);await scanDeadlineRisks(db,()=>at);
  const notices=await db.select().from(schema.notifications).where(eq(schema.notifications.projectId,task.projectId));
  assert.equal(notices.length,3);
  const own=(await supervision.listNotifications(outsider)).find(n=>n.projectId===task.projectId)!;
  assert(own);assert.equal(own.snapshot.progressPercent,0);
  await assert.rejects(supervision.markRead(worker,own.id),code("NOT_FOUND"));
  const read=await supervision.markRead(outsider,own.id);assert(read.readAt);
  assert.equal((await createSupervisionService(db).listNotifications(outsider)).find(n=>n.id===own.id)?.readAt,read.readAt);
  await supervision.revokeMentor(leader,task.projectId,outsider.user.id);
  await assert.rejects(supervision.overview(outsider,task.projectId),code("NOT_FOUND"));
  await scanDeadlineRisks(db,()=>at);
  assert(!(await supervision.listNotifications(outsider)).some(n=>n.projectId===task.projectId));
});
