import { test } from "node:test";
import assert from "node:assert/strict";
import type { Project, Task } from "../src/contracts";
import { projectSupervision } from "../src/features/tracking/supervision";
const project: Project = {id:"p",name:"Demo",goal:"Demo",deliverables:["Demo"],createdAt:"2026-11-01T00:00:00Z",deadline:"2026-11-11T00:00:00Z",timeZone:"Asia/Ho_Chi_Minh"};
const tasks = (done: number, total=10): Task[] => Array.from({length:total},(_,i)=>({id:`t${i}`,projectId:"p",planId:"plan",title:`Task ${i}`,description:"",assigneeMemberId:"m",deadline:project.deadline,criteria:[{id:`c${i}`,text:"Evidence"}],dependencyTaskIds:[],status:i<done?"done":"in_progress",version:1,acceptedSubmissionId:i<done?`s${i}`:null,acceptedByMemberId:i<done?"m":null,acceptedAt:i<done?"2026-11-05T00:00:00Z":null,createdAt:project.createdAt}));
test("warning starts exactly at 80% elapsed with at most 80% accepted; before boundary is quiet", () => {
  assert.equal(projectSupervision(project,tasks(8),"2026-11-08T23:59:59.999Z").deadlineRisk,false);
  const at=projectSupervision(project,tasks(8),"2026-11-09T00:00:00Z");
  assert.equal(at.deadlineRisk,true); assert.equal(at.progressPercent,80);assert.equal(at.elapsedPercent,80);
  assert.equal(projectSupervision(project,tasks(9),at.asOf).deadlineRisk,false);
});
test("no published tasks means unknown progress; in-progress/review work does not count as accepted",()=>{
  const empty=projectSupervision(project,[],"2026-11-09T00:00:00Z");assert.equal(empty.progressPercent,null);assert.equal(empty.deadlineRisk,false);
  const ts=tasks(0);ts[0].status="in_review";
  assert.equal(projectSupervision(project,ts,empty.asOf).progressPercent,0);
  assert.equal(projectSupervision(project,ts,empty.asOf).awaitingAcceptance,1);
  assert.equal(projectSupervision(project,tasks(10),"2026-11-12T00:00:00Z").deadlineRisk,false);
});
