import { build } from "esbuild";
import { mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
async function main() {
    await mkdir(".cache/planning-ui", { recursive: true });
    await build({ entryPoints: ["tests/browser/planning-fixture.tsx"], bundle: true, outfile: ".cache/planning-ui/fixture.js", platform: "browser", jsx: "automatic", define: { "process.env.NODE_ENV": '"development"' }, plugins: [{ name: "next-fixture", setup(b) {
                    b.onResolve({ filter: /^next\/(link|navigation)$/ }, args => ({ path: args.path, namespace: "next-fixture" }));
                    b.onLoad({ filter: /.*/, namespace: "next-fixture" }, args => ({ contents: args.path.endsWith("link") ? 'import React from "react"; export default function Link(p){return React.createElement("a",p)}' : 'export const usePathname=()=>"/app/projects/new"; export const useRouter=()=>({push:(url)=>{document.body.dataset.navigation=url}});', resolveDir: process.cwd(), loader: "js" }));
                } }] });
    const css = (await postcss([tailwind()]).process(await readFile("src/app/globals.css", "utf8"), { from: "src/app/globals.css" })).css;
    const js = await readFile(".cache/planning-ui/fixture.js");
    const server = createServer((req, res) => { res.setHeader("Content-Type", req.url === "/fixture.js" ? "text/javascript" : req.url === "/style.css" ? "text/css" : "text/html"); res.end(req.url === "/fixture.js" ? js : req.url === "/style.css" ? css : '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="root"></div><script src="/fixture.js"></script></html>'); });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const a = server.address();
    assert(a && typeof a !== "string");
    const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : undefined });
    try {
        const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
        let currentPlan: unknown;
        let projectCreates = 0, plannerCalls = 0;
        const project = {id:"p1",name:"Dự án mới",goal:"Ra mắt demo",deliverables:["Demo"],deadline:"2099-12-01T16:59:59Z",timeZone:"Asia/Ho_Chi_Minh",createdAt:"2026-01-01T00:00:00Z"};
        const members = [1,2,3].map(n=>({id:`m${n}`,projectId:"p1",userId:`u${n}`,role:n===1?"leader":"member",canAccept:n===1,skills:["Software"],availableHoursPerWeek:10}));
        await page.route("**/api/**", async (route) => {
            const req = route.request(), url = new URL(req.url()), body = req.postDataJSON();
            let data: unknown;
            if (url.pathname === "/api/notifications") {
                data=[];
            } else if (url.pathname === "/api/planning/intake") {
                data={mode:"guided_review",summary:"Làm rõ phạm vi trước khi phân việc.",questions:[{id:"scope",question:"Phạm vi cần bàn giao?",hint:"Nêu đầu ra và điều kiện kiểm tra."}],allocationNotes:["Trưởng nhóm kiểm tra trước khi công bố."]};
            } else if (url.pathname === "/api/projects") {
                projectCreates++; data = {project,member:members[0]};
            } else if (url.pathname === "/api/projects/p1") {
                data = {project,members};
            } else if (url.pathname.includes("/members/")) {
                data = members.find(m=>url.pathname.endsWith(m.id));
            } else if (url.pathname === "/api/projects/p1/plan" && req.method()==="GET") {
                data = null;
            } else if (url.pathname === "/api/projects/p1/plan") {
                plannerCalls++; await route.fulfill({status:502,json:{error:{code:"AI_UNAVAILABLE",message:"Planner thử nghiệm đang lỗi"}}});return;
            } else if (url.pathname === "/api/plans/plan1/draft") {
                const tasks = body.draftTasks;
                currentPlan = { id: "plan1", projectId: "p1", status: "draft", version: 2, aiMode: "mock", approvedByMemberId: null, publishedAt: null, createdAt: "2026-01-01T00:00:00Z", draftTasks: tasks };
                data = currentPlan;
            }
            else if (url.pathname.endsWith("/publish")) {
                assert(req.headers()["idempotency-key"]);
                assert.equal(body.approved, true);
                const p = currentPlan as {
                    draftTasks: Record<string, unknown>[];
                };
                data = { plan: { ...p, status: "published" }, tasks: p.draftTasks.map(t => ({ ...t, projectId: "p1", planId: "plan1", status: "todo", version: 1, acceptedSubmissionId: null, acceptedByMemberId: null, acceptedAt: null, createdAt: "2026-01-01T00:00:00Z" })) };
            }
            else {
                await route.fulfill({ status: 502, json: { error: { code: "AI_UNAVAILABLE", message: "Planner thử nghiệm đang lỗi" } } });
                return;
            }
            await route.fulfill({ json: { data } });
        });
        await page.goto(`http://127.0.0.1:${a.port}/?screen=plan`);
        await page.getByLabel("Tên công việc", { exact: true }).first().fill("Bản demo đã sửa");
        assert(await page.getByRole("button", { name: "Duyệt và công bố kế hoạch", exact: true }).isDisabled());
        await page.getByRole("button", { name: "Lưu bản nháp", exact: true }).click();
        await page.getByText("Đã lưu bản nháp.", { exact: true }).waitFor();
        await page.getByRole("button", { name: "Duyệt và công bố kế hoạch", exact: true }).click();
        assert(await page.getByRole("dialog").isVisible());
        await page.keyboard.press("Escape");
        assert(!(await page.getByRole("dialog").isVisible()));
        await page.screenshot({ path: ".cache/planning-ui/plan-desktop.png", fullPage: true });
        await page.getByRole("button", { name: "Duyệt và công bố kế hoạch", exact: true }).click();
        await page.getByRole("button", { name: "Xác nhận duyệt và công bố", exact: true }).click();
        await page.waitForFunction(() => document.body.dataset.navigation === "/app/projects/p1/tasks");
        await page.setViewportSize({ width: 360, height: 800 });
        await page.goto(`http://127.0.0.1:${a.port}/?screen=plan`);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.screenshot({ path: ".cache/planning-ui/plan-mobile.png", fullPage: true });
        await page.goto(`http://127.0.0.1:${a.port}/`);
        await page.getByLabel("Tên dự án", { exact: true }).fill("Dự án mới");
        await page.getByLabel("Mục tiêu", { exact: true }).fill("Ra mắt demo");
        await page.getByLabel("Đầu ra mong muốn", { exact: false }).fill("Demo");
        await page.getByLabel("Hạn dự án", { exact: false }).fill("2099-12-01");
        await page.getByRole("button", { name: "Tiếp tục" }).click();
        for (const input of await page.getByLabel("Kỹ năng", { exact: true }).all())
            await input.fill("Software");
        await page.getByRole("button", { name: "Tiếp tục" }).click();
        await page.getByRole("button", { name: "Rà soát yêu cầu", exact: true }).click();
        await page.getByLabel("Phạm vi cần bàn giao?",{exact:false}).fill("Bản demo có thể đăng nhập, tạo dự án và công bố công việc; mentor xác nhận.");
        await page.getByRole("button", { name: "Tạo kế hoạch nháp", exact: true }).click();
        await page.getByRole("alert").waitFor();
        assert(await page.getByText("Ra mắt demo", { exact: true }).isVisible());
        await page.getByRole("button", { name: "Tạo kế hoạch nháp", exact: true }).click();
        await page.getByRole("alert").waitFor();
        assert.equal(projectCreates,1); assert.equal(plannerCalls,2);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.screenshot({ path: ".cache/planning-ui/wizard-mobile.png", fullPage: true });
        const submissionKeys: string[] = [];
        await page.route("**/api/tasks/t1/submissions", async route => {
            if(route.request().method()==="GET"){await route.fulfill({json:{data:[]}});return;}
            submissionKeys.push(route.request().headers()["idempotency-key"]);
            if(submissionKeys.length===1){await route.fulfill({json:{data:{}}});return;}
            const input=route.request().postDataJSON();
            const task={id:"t1",title:"Công việc 1",description:"Chuẩn bị demo",assigneeMemberId:"m1",deadline:project.deadline,criteria:[{id:"c1",text:"Có bản demo để kiểm tra"}],dependencyTaskIds:[],projectId:"p1",planId:"plan1",status:"in_review",version:2,acceptedSubmissionId:null,acceptedByMemberId:null,acceptedAt:null,createdAt:project.createdAt};
            await route.fulfill({json:{data:{task,submission:{id:"s1",projectId:"p1",taskId:"t1",authorMemberId:"m1",revision:1,contentType:input.contentType,content:input.content,criteriaSnapshot:task.criteria,submittedAt:new Date().toISOString()}}}});
        });
        await page.route("**/api/submissions/s1/review",route=>route.fulfill({json:{data:null}}));
        await page.goto(`http://127.0.0.1:${a.port}/?screen=delivery`);
        const content=page.getByLabel("Nội dung bài nộp (Bắt buộc)");
        await content.fill("Bằng chứng cần được giữ lại khi phản hồi server không hợp lệ.");
        await page.getByRole("button",{name:"Nộp bài & Yêu cầu Review",exact:true}).click();
        await page.getByText("Cấu trúc dữ liệu phản hồi không hợp lệ.",{exact:true}).waitFor();
        assert.equal(await content.inputValue(),"Bằng chứng cần được giữ lại khi phản hồi server không hợp lệ.");
        await page.getByRole("button",{name:"Nộp bài & Yêu cầu Review",exact:true}).click();
        await page.waitForFunction(()=> (document.querySelector("#submission-content") as HTMLTextAreaElement)?.value === "");
        assert.equal(submissionKeys.length,2); assert.equal(submissionKeys[0],submissionKeys[1]);
        let aiState={mode:"inherit",model:"test-model",hasKey:false,canSave:true,lastCheck:null};
        const testKey="sk-fixture-only-not-an-actual-key";
        await page.route("**/api/ai/settings",async route=>{
            if(route.request().method()==="PUT"){const input=route.request().postDataJSON();assert.equal(input.apiKey,testKey);assert.equal(input.mode,"mock");aiState={...aiState,hasKey:true,mode:input.mode,model:input.model};}
            await route.fulfill({json:{data:aiState}});
        });
        await page.route("**/api/ai/settings/check",async route=>{
            const input=route.request().postDataJSON();assert.equal(input.apiKey,undefined);
            const agents=input.test==="agents"?["planner","coordinator","reviewer","weekly_report"].map(agent=>({agent,ok:true,code:"CONNECTED",message:"Phản hồi kiểm tra đạt."})):[];
            await route.fulfill({json:{data:{checkedAt:new Date().toISOString(),test:input.test,ok:true,code:"TEST_OK",message:input.test==="key"?"Khóa kiểm tra được chấp nhận.":"Bốn trợ lý kiểm tra đạt.",modelAvailable:true,models:["test-model"],agents}}});
        });
        await page.goto(`http://127.0.0.1:${a.port}/?screen=settings`);
        await page.getByLabel("OpenAI API key",{exact:true}).fill(testKey);
        await page.getByLabel("Chế độ AI",{exact:true}).selectOption("mock");
        await page.getByRole("button",{name:"Lưu cấu hình",exact:true}).click();
        await page.getByText("Đã lưu cấu hình AI cho tài khoản của bạn. Khóa được mã hóa ở máy chủ.",{exact:true}).waitFor();
        assert.equal(await page.getByLabel("OpenAI API key",{exact:true}).inputValue(),"");
        await page.getByRole("button",{name:"Kiểm tra khóa và model",exact:true}).click();await page.getByText("Khóa kiểm tra được chấp nhận.",{exact:true}).waitFor();
        await page.getByRole("button",{name:"Chạy thử 4 trợ lý · Có thể tính phí",exact:true}).click();await page.getByText("Bốn trợ lý kiểm tra đạt.",{exact:true}).waitFor();
        assert.equal(await page.getByText("Phản hồi kiểm tra đạt.",{exact:true}).count(),4);
        assert.equal(await page.evaluate(()=>localStorage.length),0);
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        await page.screenshot({path:".cache/planning-ui/ai-settings-mobile.png",fullPage:true});
        console.log("Planning/delivery/settings browser: guided wizard, publish, 360px, error retention, submission retry, masked key save, key/model check and 4 agent statuses passed (fixture API; no real OpenAI call).");
    }
    finally {
        await browser.close();
        server.close();
    }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
