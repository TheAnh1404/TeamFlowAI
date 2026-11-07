import test from "node:test";
import assert from "node:assert/strict";
import { hashSessionToken, newSessionToken } from "../../../server/auth/credentials.ts";
import { mutationIdentity } from "../../../server/db/idempotency-key.ts";

test("session token ngẫu nhiên và database chỉ lưu SHA-256", () => {
  const first = newSessionToken();
  const second = newSessionToken();
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.notEqual(first, second);
  assert.notEqual(hashSessionToken(first), first);
  assert.equal(hashSessionToken(first), hashSessionToken(first));
});
test("retry cùng user, endpoint, key và body giữ nguyên danh tính", () => {
  const request = ["u2", "POST /api/projects/p1/messages", "mutation-key", { content: "đang làm", taskId: "t1" }];
  assert.deepEqual(mutationIdentity(...request), mutationIdentity(...request));
});
test("cùng key khác nội dung giữ scope nhưng đổi fingerprint để báo conflict", () => {
  const first = mutationIdentity("u2", "POST /api/projects/p1/messages", "mutation-key", { content: "đang làm" });
  const next = mutationIdentity("u2", "POST /api/projects/p1/messages", "mutation-key", { content: "bị chặn" });
  assert.equal(first.scope, next.scope);
  assert.notEqual(first.fingerprint, next.fingerprint);
});
test("key bị cô lập theo người dùng và endpoint", () => {
  const original = mutationIdentity("u2", "chat", "mutation-key", {});
  assert.notEqual(original.scope, mutationIdentity("u3", "chat", "mutation-key", {}).scope);
  assert.notEqual(original.scope, mutationIdentity("u2", "resolve", "mutation-key", {}).scope);
});
