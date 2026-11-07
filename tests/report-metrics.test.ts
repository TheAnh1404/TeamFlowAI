import test from "node:test";
import assert from "node:assert/strict";
import type {Task,Submission} from "../src/contracts";
import {calculateReportMetrics} from "../src/features/delivery/server/metrics";

test("report uses [start,end), deadline equality and separate submission/acceptance clocks",()=>{
  const start="2026-11-01T00:00:00.000Z",end="2026-11-08T00:00:00.000Z";
  const task=(id:string,deadline:string,patch:Partial<Task>={}):Task=>({id,projectId:"p",planId:"plan",title:id,description:"",assigneeMemberId:"m",criteria:[{id:"c",text:"Evidence"}],dependencyTaskIds:[],deadline,status:"in_review",version:1,acceptedAt:null,acceptedSubmissionId:null,acceptedByMemberId:null,createdAt:start,...patch});
  const submission=(id:string,taskId:string,submittedAt:string):Submission=>({id,taskId,projectId:"p",authorMemberId:"m",revision:1,contentType:"text",content:"Evidence",criteriaSnapshot:[{id:"c",text:"Evidence"}],submittedAt});
  const due="2026-11-04T10:00:00.000Z";
  const result=calculateReportMetrics({
    tasks:[task("late-accept",due,{status:"done",acceptedAt:"2026-11-05T10:00:00.000Z",acceptedSubmissionId:"s1",acceptedByMemberId:"m"}),task("at-start",start),task("at-end",end),task("missing",due)],
    submissions:[submission("s1","late-accept",due),submission("s2","at-start",start),submission("s3","at-end",end)],
    messages:[],reviews:[],progressUpdates:[],
  },start,end,end);
  assert.equal(result.dueInPeriodTotal,3);
  assert.equal(result.submittedOnTimeTotal,2);
  assert.equal(result.acceptedOnTimeTotal,0);
  assert.equal(result.submissionsInPeriodTotal,2);
  assert.equal(result.overdueOpenTotal,2);
  assert.deepEqual(result.statusCounts,{todo:0,in_progress:0,blocked:0,in_review:3,changes_requested:0,done:1});
});
