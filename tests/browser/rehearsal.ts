import {spawn,execFileSync,type ChildProcess} from "node:child_process";
import {once} from "node:events";
import {setTimeout as delay} from "node:timers/promises";
import {mkdir} from "node:fs/promises";
import assert from "node:assert/strict";
import {chromium,type Page,type APIRequestContext} from "@playwright/test";
import type {Task,Project,ProjectMember,Plan,WeeklyReport,ProgressMessageResult,Submission,Review} from "../../src/contracts";

const port=Number(process.env.REHEARSAL_TEST_PORT??3011),base=`http://127.0.0.1:${port}`;
const accessCode="rehearsal-test-only-code-2026";
const env={...process.env,TEAMFLOW_DATABASE_MODE:"local-demo",DEMO_DATABASE_NAME:`e2e-${Date.now()}`,ENABLE_DEMO_AUTH:"true",DEMO_ACCESS_CODE:accessCode,AI_FORCE_MOCK:"true",LOCAL_DEMO_DEADLINE_WORKER:"true",DEADLINE_SCAN_INTERVAL_MS:"1000"};
let server:ChildProcess|undefined,logs="";
async function start(){
  logs="";server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port",String(port)],{env,stdio:["ignore","pipe","pipe"],windowsHide:true});
  server.stdout?.on("data",data=>{logs=(logs+String(data)).slice(-6000);});server.stderr?.on("data",data=>{logs=(logs+String(data)).slice(-6000);});
  for(let i=0;i<150;i++){
    if(server.exitCode!==null)throw Error(`Rehearsal server exited: ${logs}`);
    try{const r=await fetch(base+"/api/health",{signal:AbortSignal.timeout(1000)});if(r.ok)return;}catch{}
    await delay(200);
  }
  throw Error(`Rehearsal server not ready: ${logs}`);
}
async function stop(){if(server&&server.exitCode===null){const exited=once(server,"exit");server.kill();await exited;}server=undefined;}
async function data<T>(request:APIRequestContext,path:string,method="GET",body?:unknown):Promise<T>{
  const response=await request.fetch(base+path,{method,headers:{Origin:base,"Idempotency-Key":crypto.randomUUID()},...(body===undefined?{}:{data:body})});
  const parsed=await response.json();assert(response.ok(),`${method} ${path}: ${response.status()} ${JSON.stringify(parsed)}`);return parsed.data as T;
}
async function login(page:Page,account:string){
  await page.goto(base+"/app");await page.getByLabel("Tài khoản",{exact:true}).selectOption(account);await page.getByLabel("Mã truy cập demo",{exact:true}).fill(accessCode);
  const responsePromise=page.waitForResponse(r=>r.url()===base+"/api/session"&&r.request().method()==="POST");
  await page.getByRole("button",{name:/Vào phiên demo|Đổi tài khoản/}).click();
  const response=await responsePromise;assert(response.ok(),`Login POST: ${response.status()} ${await response.text()}`);
  const session=await page.request.get(base+"/api/session");assert(session.ok(),`Login cookie not persisted: ${session.status()} ${await session.text()}`);
  await page.getByText(new RegExp(`Đang dùng ${account}`)).waitFor({timeout:20000});
}
async function main(){
  await mkdir(".cache/rehearsal-ui",{recursive:true});
  execFileSync(process.execPath,["--conditions=react-server","--import","tsx","scripts/demo-setup.ts"],{env,stdio:"pipe"});
  await start();const browser=await chromium.launch({channel:process.platform==="win32"?"msedge":undefined});
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
  try{
    await page.goto(base+"/");await page.getByRole("heading",{level:1,name:/Cả nhóm rõ việc.*Trưởng nhóm nắm tiến độ/}).waitFor();
    for(const cta of await page.getByRole("link",{name:"Bắt đầu lập kế hoạch",exact:true}).all())assert.equal(await cta.getAttribute("href"),"/app");
    assert.equal(await page.locator(".tf-faq details").count(),4);await page.locator(".tf-faq summary").first().click();
    await page.setViewportSize({width:360,height:800});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:".cache/rehearsal-ui/landing-mobile.png",fullPage:true});await page.setViewportSize({width:1440,height:1000});
    await login(page,"TV1");console.log("PASS rehearsal login");
    const fakeKey="sk-rehearsal-fixture-only-not-real-key";
    await page.getByRole("link",{name:/Cấu hình AI/}).click();
    await page.getByLabel("OpenAI API key",{exact:true}).fill(fakeKey);await page.getByLabel("Chế độ AI",{exact:true}).selectOption("mock");
    await page.getByRole("button",{name:"Lưu cấu hình",exact:true}).click();await page.getByText("Đã lưu cấu hình AI cho tài khoản của bạn. Khóa được mã hóa ở máy chủ.",{exact:true}).waitFor();
    assert.equal(await page.getByLabel("OpenAI API key",{exact:true}).inputValue(),"");
    const stored=await data<{hasKey:boolean}>(page.request,"/api/ai/settings");assert(stored.hasKey);assert(!JSON.stringify(stored).includes(fakeKey));
    await page.screenshot({path:".cache/rehearsal-ui/ai-settings.png",fullPage:true});
    await page.goto(base+"/app");
    await page.getByRole("link",{name:"Tạo dự án mới",exact:true}).click();
    await page.getByLabel("Tên dự án",{exact:true}).fill("Diễn tập sân khấu — dữ liệu cục bộ");
    await page.getByLabel("Mục tiêu",{exact:true}).fill("Nhóm phát triển API quản lý công việc để trưởng nhóm tạo và công bố nhiệm vụ. Bản bàn giao phải có hướng dẫn sử dụng, kiểm tra lỗi và bằng chứng để mentor đối chiếu.");
    await page.getByLabel("Đầu ra mong muốn",{exact:false}).fill("API backend quản lý công việc");await page.getByLabel("Hạn dự án",{exact:false}).fill("2099-12-01");await page.getByRole("button",{name:"Tiếp tục"}).click();
    const skills=await page.getByLabel("Kỹ năng",{exact:true}).all();for(const [i,input]of skills.entries())await input.fill(["Planning Frontend","Backend API SQL","QA kiểm thử tài liệu"][i]);
    await page.getByRole("button",{name:"Tiếp tục"}).click();await page.getByRole("button",{name:"Rà soát yêu cầu",exact:true}).click();
    await page.getByRole("heading",{name:"Rà soát yêu cầu trước khi phân việc"}).waitFor();
    for(const input of await page.locator('section[aria-label="Làm rõ yêu cầu"] textarea').all())await input.fill("Bản demo tập trung API nhiệm vụ; có dữ liệu mẫu và tài liệu kiểm thử. Ngoài phạm vi: OAuth và tích hợp lịch. Mentor kiểm tra bằng bằng chứng đã nộp.");
    await page.getByRole("button",{name:"Tạo kế hoạch nháp",exact:true}).click();await page.waitForURL(/\/plan$/,{timeout:30000});
    const projectId=new URL(page.url()).pathname.split("/")[3];console.log("PASS rehearsal guided draft");
    assert((await page.getByLabel("Mô tả",{exact:true}).first().inputValue()).includes("Lý do phân công:"));
    const title=page.getByLabel("Tên công việc",{exact:true}).first();await title.fill((await title.inputValue())+" — đã duyệt phạm vi");
    await page.getByRole("button",{name:"Lưu bản nháp",exact:true}).click();await page.getByText("Đã lưu bản nháp.",{exact:true}).waitFor();
    assert.equal((await data<Task[]>(page.request,`/api/projects/${projectId}/tasks`)).length,0);
    await page.getByRole("button",{name:"Duyệt và công bố kế hoạch",exact:true}).click();await page.getByRole("button",{name:"Xác nhận duyệt và công bố",exact:true}).click();await page.waitForURL(/\/tasks$/);
    await page.getByText(/Mentor đồng hành ·/).click();await page.getByLabel("Chọn tài khoản mentor",{exact:true}).selectOption("demo-mentor");await page.getByRole("button",{name:"Cấp quyền xem",exact:true}).click();await page.getByText("Đã cấp quyền xem dự án cho mentor.",{exact:true}).waitFor();
    const tasks=await data<Task[]>(page.request,`/api/projects/${projectId}/tasks`);assert.equal(tasks.length,2);
    const first=tasks.find(t=>t.dependencyTaskIds.length===0)!;
    const workerContext=await browser.newContext(),worker=await workerContext.newPage();await login(worker,"TV2");
    await worker.goto(`${base}/app/projects/${projectId}/chat`);
    const messagePromise=worker.waitForResponse(r=>r.url()===`${base}/api/projects/${projectId}/messages`&&r.request().method()==="POST");
    await worker.getByLabel("Nội dung cập nhật",{exact:true}).fill("phần đó bị chặn");await worker.getByRole("button",{name:"Gửi",exact:true}).click();
    const ambiguous=(await (await messagePromise).json()).data as ProgressMessageResult;
    assert.equal(ambiguous.message.resolution,"clarification_required");assert.equal(ambiguous.progressUpdate,null);
    assert.equal((await data<Task>(worker.request,`/api/tasks/${first.id}`)).version,first.version);
    await worker.getByLabel("Chọn công việc cần cập nhật",{exact:true}).selectOption(first.id);
    await worker.getByLabel("Mô tả trở ngại",{exact:true}).fill("Thiếu quyền truy cập API thử nghiệm");
    const resolvePromise=worker.waitForResponse(r=>r.url().endsWith(`/api/messages/${ambiguous.message.id}/resolve`)&&r.request().method()==="POST");
    await worker.getByRole("button",{name:"Xác nhận cập nhật",exact:true}).click();
    const resolved=(await (await resolvePromise).json()).data as ProgressMessageResult;assert.equal(resolved.task?.status,"blocked");
    assert.equal(resolved.task?.deadline,first.deadline);assert.deepEqual(resolved.task?.criteria,first.criteria);assert.equal(resolved.task?.assigneeMemberId,first.assigneeMemberId);
    await worker.goto(`${base}/app/projects/${projectId}/tasks/${first.id}`);
    await worker.getByLabel("Nội dung bài nộp (Bắt buộc)").fill("Chỉ có mô tả mục tiêu, chưa có bằng chứng triển khai.");
    await worker.getByRole("button",{name:"Nộp bài & Yêu cầu Review",exact:true}).click();
    await worker.getByRole("button",{name:"Yêu cầu Reviewer AI đánh giá",exact:true}).click();
    await worker.getByText("⚠ Vẫn còn tiêu chí chưa đạt hoặc chưa đủ bằng chứng. Chưa thể xác nhận hoàn thành.",{exact:true}).waitFor();
    const revision1=(await data<Submission[]>(worker.request,`/api/tasks/${first.id}/submissions`))[0];
    const review1=await data<Review>(worker.request,`/api/submissions/${revision1.id}/review`);assert(review1.results.some(r=>r.verdict==="insufficient_evidence"));
    assert.equal(await worker.getByRole("button",{name:"Xác nhận hoàn thành (Done)",exact:true}).count(),0);
    console.log("PASS TV2 real chat ambiguity, resolve, blocker, insufficient evidence and server permissions");
    await page.getByRole("link",{name:first.title,exact:true}).click();await page.getByRole("dialog").waitFor();
    const evidence=first.criteria.map(c=>`## ${c.text}\nĐã triển khai API và kiểm tra tình huống hợp lệ, dữ liệu thiếu và lỗi quyền. Bằng chứng: phản hồi 200 cho thao tác hợp lệ, 422 khi thiếu dữ liệu, 403 khi sai quyền; hướng dẫn tái hiện và log kiểm tra được đính kèm trong nội dung bàn giao này.`).join("\n\n");
    await worker.getByLabel("Nội dung bài nộp (Bắt buộc)").fill(evidence);await worker.getByRole("button",{name:"Nộp bài & Yêu cầu Review",exact:true}).click();
    await worker.getByRole("button",{name:"Yêu cầu Reviewer AI đánh giá",exact:true}).click();
    await worker.getByText("✓ Toàn bộ tiêu chí đã được Reviewer xác nhận đạt yêu cầu.",{exact:true}).waitFor();
    const revisions=await data<Submission[]>(worker.request,`/api/tasks/${first.id}/submissions`);assert.deepEqual(revisions.map(s=>s.revision),[2,1]);assert.equal(revisions[1].id,revision1.id);
    await page.reload();
    const accept=page.getByRole("button",{name:"Xác nhận hoàn thành (Done)",exact:true});await accept.waitFor({state:"visible"});
    for(let i=0;i<50&&await accept.isDisabled();i++)await delay(100);
    assert(!(await accept.isDisabled()));await accept.click();await page.getByRole("heading",{name:"Lịch sử cập nhật"}).count();
    await page.getByRole("button",{name:"Đóng chi tiết công việc",exact:true}).click();
    await page.waitForURL(url=>url.pathname===`/app/projects/${projectId}/tasks`);await page.getByRole("dialog").waitFor({state:"hidden"});
    assert.equal(await page.locator(`#task-${first.id}`).evaluate(el=>el===document.activeElement),true);
    await page.getByText("50% đã nghiệm thu",{exact:true}).waitFor();await page.reload();await page.getByText("50% đã nghiệm thu",{exact:true}).waitFor();
    await page.screenshot({path:".cache/rehearsal-ui/workspace.png",fullPage:true});
    const tv3Context=await browser.newContext(),tv3=await tv3Context.newPage();await login(tv3,"TV3");
    const second=tasks.find(t=>t.id!==first.id)!;
    await tv3.goto(`${base}/app/projects/${projectId}/tasks/${second.id}`);
    await tv3.getByLabel("Nội dung bài nộp (Bắt buộc)").fill("Bản kiểm thử cần bổ sung bằng chứng trước khi nghiệm thu.");
    await tv3.getByRole("button",{name:"Nộp bài & Yêu cầu Review",exact:true}).click();
    await tv3.getByRole("button",{name:"Yêu cầu Reviewer AI đánh giá",exact:true}).click();
    await tv3.getByText("⚠ Vẫn còn tiêu chí chưa đạt hoặc chưa đủ bằng chứng. Chưa thể xác nhận hoàn thành.",{exact:true}).waitFor();
    const tv3Submission=(await data<Submission[]>(tv3.request,`/api/tasks/${second.id}/submissions`))[0];
    const details=await data<{project:Project;members:ProjectMember[]}>(tv3.request,`/api/projects/${projectId}`);
    assert.equal(tv3Submission.authorMemberId,details.members.find(m=>m.userId==="demo-tv3")?.id);
    console.log("PASS TV3 own session submission/review; TV1 accepts reviewed revision 2; drawer stays closed");
    await page.getByRole("link",{name:"Báo cáo",exact:true}).click();await page.getByRole("button",{name:"+ Tạo báo cáo tuần mới",exact:true}).click();await page.getByRole("button",{name:"Tạo báo cáo ngay",exact:true}).click();
    await page.getByText("3. Công việc theo trạng thái tại mốc báo cáo",{exact:true}).waitFor();
    const reports=await data<WeeklyReport[]>(page.request,`/api/projects/${projectId}/reports`);assert.equal(reports[0].metrics.statusCounts.done,1);assert.equal(reports[0].aiMode,"mock");assert.equal(reports[0].metrics.submissionsInPeriodTotal,3);assert.equal(reports[0].metrics.progressUpdatesInPeriodTotal,1);
    const source=reports[0].sourceRefs.find(r=>r.entity==="Submission"&&r.id===revisions[0].id)!;assert(source);const response=await page.request.get(`${base}/api/reports/${reports[0].id}/source?entity=${source.entity}&id=${source.id}`);assert(response.ok());assert.equal((await response.json()).data.record.content,evidence);
    await page.screenshot({path:".cache/rehearsal-ui/report.png",fullPage:true});

    const short=await data<{project:Project;member:ProjectMember}>(page.request,"/api/projects","POST",{name:"Cảnh báo deadline diễn tập",goal:"Theo dõi cảnh báo thực khi đã dùng hết 80% thời gian và chưa vượt 80% nghiệm thu.",deliverables:["API demo"],deadline:new Date(Date.now()+30000).toISOString(),timeZone:"Asia/Ho_Chi_Minh"});
    await data(page.request,`/api/projects/${short.project.id}/members/${short.member.id}`,"PATCH",{skills:["API"],availableHoursPerWeek:10});
    const draft=await data<Plan>(page.request,`/api/projects/${short.project.id}/plan`,"POST");await data(page.request,`/api/plans/${draft.id}/publish`,"POST",{expectedVersion:draft.version,approved:true});
    await data(page.request,`/api/projects/${short.project.id}/mentors`,"POST",{userId:"demo-mentor"});
    let found=false;
    for(let i=0;i<40;i++){const notices=await data<{projectId:string}[]>(page.request,"/api/notifications");if(notices.some(n=>n.projectId===short.project.id)){found=true;break;}await delay(1000);}
    assert(found,"Background deadline worker should create a notice without opening project views");
    const mentorContext=await browser.newContext({viewport:{width:360,height:800}}),mentor=await mentorContext.newPage();await login(mentor,"MENTOR");
    assert.equal((await data<{hasKey:boolean}>(mentor.request,"/api/ai/settings")).hasKey,false);
    await mentor.getByRole("link",{name:"Diễn tập sân khấu — dữ liệu cục bộ →",exact:true}).click();await mentor.getByText("50% đã nghiệm thu",{exact:true}).waitFor();
    assert.equal(await mentor.getByRole("button",{name:/Cấp quyền xem|Nộp bài|Duyệt và công bố/}).count(),0);
    assert(await mentor.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await mentor.getByLabel(/Thông báo, \d+ chưa đọc/).click();await mentor.getByRole("button",{name:"Tải lại",exact:true}).click();await mentor.getByText("Cần rà soát tiến độ: Cảnh báo deadline diễn tập",{exact:true}).waitFor();
    assert(await mentor.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await mentor.getByRole("button",{name:"Đánh dấu đã đọc",exact:true}).click();await mentor.reload();
    const notices=await data<{projectId:string;readAt:string|null}[]>(mentor.request,"/api/notifications");assert(notices.find(n=>n.projectId===short.project.id)?.readAt);
    await mentor.screenshot({path:".cache/rehearsal-ui/mentor-mobile.png",fullPage:true});
    const denied=await mentor.request.post(`${base}/api/plans/${draft.id}/publish`,{headers:{Origin:base,"Idempotency-Key":crypto.randomUUID()},data:{expectedVersion:draft.version,approved:true}});assert([403,404].includes(denied.status()));
    await stop();await start();await page.goto(`${base}/app/projects/${projectId}/tasks`);await page.getByText("50% đã nghiệm thu",{exact:true}).waitFor();
    const persisted=await data<WeeklyReport[]>(page.request,`/api/projects/${projectId}/reports`);assert.equal(persisted[0].id,reports[0].id);
    assert.equal((await data<{hasKey:boolean}>(page.request,"/api/ai/settings")).hasKey,true);
    assert.equal((await data<{hasKey:boolean}>(page.request,"/api/ai/settings","DELETE")).hasKey,false);
    await mentor.goto(`${base}/app/projects/${projectId}/supervision`);await mentor.getByText("50% đã nghiệm thu",{exact:true}).waitFor();
    console.log("PASS rehearsal: real app UI + local PostgreSQL, encrypted per-user AI settings (fake key, no OpenAI call), guided Planner, publish, mentor grant, submit/review/accept, progress, report/source, 80% background notice, read state, mentor read-only, 360px, and persistence after server restart. AI mode: mock; Neon and real provider not used.");
  }catch(e){for(const [i,tab] of browser.contexts().flatMap(c=>c.pages()).entries()){await tab.screenshot({path:`.cache/rehearsal-ui/failure-${i}.png`,fullPage:true}).catch(()=>{});console.error(tab.url(),(await tab.locator("body").innerText()).slice(-5000));}throw e;}
  finally{await browser.close();await stop();}
}
main().catch(async e=>{console.error(e);if(logs)console.error(logs);await stop();process.exitCode=1;});
