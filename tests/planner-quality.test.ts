import { test } from "node:test";
import assert from "node:assert/strict";
import type { PlanningAiInput } from "../src/server/ai/contracts";
import { detailedMockPlanner } from "../src/server/ai/planner-mock";
import { createPlanner } from "../src/features/planning/server/planner";
import { reviewLeaderInput } from "../src/features/planning/intake";
const input:PlanningAiInput={project:{id:"p",name:"Demo",goal:"Tạo API và giao diện cho nhóm demo.",deliverables:["API backend quản lý task","Giao diện frontend React"],createdAt:"2026-11-01T00:00:00Z",deadline:"2026-11-15T00:00:00Z",timeZone:"Asia/Ho_Chi_Minh"},members:[
  {id:"m1",projectId:"p",userId:"u1",role:"leader",canAccept:true,skills:["Backend API SQL"],availableHoursPerWeek:10},
  {id:"m2",projectId:"p",userId:"u2",role:"member",canAccept:false,skills:["Frontend React UX"],availableHoursPerWeek:10},
  {id:"m3",projectId:"p",userId:"u3",role:"member",canAccept:false,skills:["QA kiểm thử tài liệu"],availableHoursPerWeek:10},
]};
test("Planner uses relevant skills, produces implementation and verification with traceable allocation",async()=>{
  const proposal=detailedMockPlanner(input);
  assert.deepEqual(proposal,detailedMockPlanner(input));
  assert.equal(proposal.tasks.length,4);
  assert.equal(proposal.tasks.find(t=>t.tempKey==="output-1-1")?.assigneeMemberId,"m1");
  assert.equal(proposal.tasks.find(t=>t.tempKey==="output-2-1")?.assigneeMemberId,"m2");
  for(const task of proposal.tasks){assert(task.steps&&task.steps.length>=3);assert(task.assignmentReason);assert(task.estimatedHours);assert(task.criteria.length>=2);assert(Date.parse(task.deadline)<=Date.parse(input.project.deadline));for(const id of task.dependencyTempKeys){const dependency=proposal.tasks.find(t=>t.tempKey===id)!;assert(Date.parse(dependency.deadline)<=Date.parse(task.deadline));}}
  const result=await createPlanner(undefined,"mock")(input);
  assert(result.proposal.tasks.every(t=>t.description.includes("Lý do phân công:")&&t.description.includes("cần trưởng nhóm xác nhận")));
});
test("input review asks concrete scope, acceptance and constraints before generation",()=>{
  const reviewed=reviewLeaderInput({project:input.project,members:input.members});
  assert(reviewed.questions.some(q=>q.id==="success"));assert(reviewed.questions.some(q=>q.id==="scope"));assert(reviewed.questions.some(q=>q.id==="constraints"));
  assert.equal(reviewed.mode,"guided_review");
});
