import { build } from "esbuild";
import { readFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

async function main() {
  await mkdir(".cache/ui", { recursive: true });
  await build({ entryPoints: ["tests/browser/fixture.tsx"], bundle: true, outfile: ".cache/ui/fixture.js", platform: "browser", jsx: "automatic", define: { "process.env.NODE_ENV": '"development"', "process.env": "{}" }, logLevel: "silent" });
  const globalCss = await postcss([tailwind()]).process(await readFile("src/app/globals.css", "utf8"), { from: "src/app/globals.css" });
  const assets: Record<string, { type: string; body: string | Buffer }> = {
    "/": { type: "text/html", body: '<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/global.css"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>' },
    "/global.css": { type: "text/css", body: globalCss.css },
    "/fixture.css": { type: "text/css", body: await readFile(".cache/ui/fixture.css") },
    "/fixture.js": { type: "text/javascript", body: await readFile(".cache/ui/fixture.js") },
  };
  const server = createServer((req, res) => { const asset = assets[req.url ?? "/"]; if (!asset) { res.writeHead(404); res.end(); return; } res.setHeader("Content-Type", asset.type); res.end(asset.body); });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert(address && typeof address !== "string");
  const browser = await chromium.launch(process.platform === "win32" ? { channel: "msedge" } : {});
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors: string[] = []; page.on("pageerror", (e) => { errors.push(e.message); console.error("Browser:", e.message); });
    await page.goto(`http://127.0.0.1:${address.port}/`);
    await page.getByRole("link", { name: "API tracking", exact: true }).waitFor();
    await page.getByRole("button", { name: "Việc của tôi" }).click();
    assert.equal(await page.locator("tbody tr").count(), 1);
    await page.getByRole("button", { name: "Xóa bộ lọc" }).click();
    assert.equal(await page.locator("tbody tr").count(), 3);
    const taskLink = page.getByRole("link", { name: "API tracking", exact: true });
    await taskLink.click();
    await page.getByRole("dialog").waitFor({ state: "visible" });
    await page.keyboard.press("Shift+Tab");
    assert.equal(await page.getByLabel("Bài nộp kiểm thử").evaluate((el) => el === document.activeElement), true);
    await page.keyboard.press("Tab");
    assert.equal(await page.getByRole("button", { name: "Đóng chi tiết công việc" }).evaluate((el) => el === document.activeElement), true);
    assert(page.url().endsWith("/app/projects/p1/tasks/t1"));
    assert.equal(await page.locator("script").count(), 1); // user script remains escaped text
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").isVisible(), false);
    assert.equal(await page.locator("body").getAttribute("data-navigation"), "/app/projects/p1/tasks");
    assert.equal(await taskLink.evaluate((el) => el === document.activeElement), true);
    await taskLink.click(); await page.getByLabel("Bài nộp kiểm thử").fill("draft");
    page.once("dialog", (dialog) => dialog.dismiss()); await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").isVisible(), true);
    page.once("dialog", (dialog) => dialog.accept()); await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").isVisible(), false);
    await page.screenshot({ path: ".cache/ui/board-desktop.png", fullPage: true });
    console.log("PASS desktop filters, drawer URL, Escape/focus, unsaved draft and safe rendering");
    await page.setViewportSize({ width: 360, height: 800 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await taskLink.click(); assert.equal(await page.locator("body").getAttribute("data-navigation"), "/app/projects/p1/tasks/t1");
    await page.screenshot({ path: ".cache/ui/board-mobile.png", fullPage: true });
    console.log("PASS mobile 360px layout and full-page task navigation");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole("button", { name: "Task trực tiếp" }).click();
    await page.getByRole("dialog").waitFor({ state: "visible" });
    await page.setViewportSize({ width: 360, height: 800 });
    await page.getByRole("link", { name: "← Quay lại danh sách" }).waitFor();
    assert.equal(await page.getByRole("dialog").count(), 0);
    console.log("PASS direct task URL layout: desktop drawer and mobile full page");
    await page.getByRole("button", { name: "Chat kiểm thử" }).click();
    assert.equal(await page.locator("img").count(), 0);
    const textarea = page.getByLabel("Nội dung cập nhật");
    const posts: { body: string; key: string | undefined }[] = [];
    await page.route("**/api/projects/p1/messages", async (route) => { posts.push({ body: route.request().postData()!, key: route.request().headers()["idempotency-key"] }); await route.fulfill({ status: 504, contentType: "application/json", body: JSON.stringify({ error: { code: "AI_TIMEOUT", message: "AI timeout kiểm thử" } }) }); });
    await textarea.fill("Cập nhật thử"); await textarea.press("Shift+Enter");
    assert.equal(posts.length, 0);
    await textarea.dispatchEvent("keydown", { key: "Enter", isComposing: true, bubbles: true });
    assert.equal(posts.length, 0);
    await textarea.press("Enter"); await page.getByRole("alert").filter({ hasText: "AI timeout" }).waitFor();
    assert((await textarea.inputValue()).includes("Cập nhật thử"));
    await page.getByRole("button", { name: "Gửi lại", exact: true }).click();
    await page.waitForFunction(() => !document.querySelector("textarea:disabled"));
    assert.equal(posts.length, 2); assert.equal(posts[0].key, posts[1].key);
    const success = JSON.stringify({ data: { message: { id: "saved", projectId: "p1", authorMemberId: "m2", content: "Cập nhật thử", taskId: null, candidateTaskIds: [], resolution: "no_change", clarificationQuestion: null, aiMode: "mock", createdAt: "2026-11-07T03:00:00.000Z" }, progressUpdate: null, task: null } });
    await page.unroute("**/api/projects/p1/messages");
    await page.route("**/api/projects/p1/messages", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: {} }) }));
    await page.getByRole("button", { name: "Gửi lại", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "Cấu trúc dữ liệu phản hồi không hợp lệ" }).waitFor();
    assert((await textarea.inputValue()).includes("Cập nhật thử"));
    await page.unroute("**/api/projects/p1/messages");
    await page.route("**/api/projects/p1/messages", (route) => route.fulfill({ status: 200, contentType: "application/json", body: success }));
    await page.getByRole("button", { name: "Gửi lại", exact: true }).click();
    await page.waitForFunction(() => document.body.dataset.refreshed === "true");
    assert.equal(await textarea.inputValue(), "");
    await page.getByLabel("Chọn công việc cần cập nhật").selectOption("t1");
    await page.getByLabel("Mô tả trở ngại").fill("Chờ API");
    let resolved = false;
    await page.route("**/api/messages/msg1/resolve", async (route) => { const body = route.request().postDataJSON(); assert.equal(body.expectedTaskVersion, 1); assert.equal(body.blocker, "Chờ API"); resolved = true; await route.fulfill({ status: 200, contentType: "application/json", body: success }); });
    await page.getByRole("button", { name: "Xác nhận cập nhật" }).click();
    await page.waitForFunction(() => !document.querySelector("textarea:disabled")); assert(resolved);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.screenshot({ path: ".cache/ui/chat-mobile.png", fullPage: true });
    console.log("PASS chat IME/newlines, input retention, stable retry key, resolve and escaped content");
    assert.deepEqual(errors, []);
  } finally { await browser.close(); await new Promise<void>((resolve, reject) => server.close((e) => e ? reject(e) : resolve())); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
