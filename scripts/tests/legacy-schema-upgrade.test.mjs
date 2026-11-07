import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { upgradeLegacyFoundation } from "../lib/legacy-schema-upgrade.mjs";

async function legacyDatabase(hashOverride) {
  const db = new PGlite();
  const sql = readFileSync("drizzle/0000_tracking_foundation.sql", "utf8");
  await db.exec(sql);
  await db.exec('create schema drizzle; create table drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)');
  await db.query("insert into drizzle.__drizzle_migrations (hash, created_at) values ($1,$2)", [hashOverride ?? createHash("sha256").update(sql).digest("hex"), 1793996654289]);
  return db;
}

test("legacy upgrade is previewable, preserves users/sessions, and is idempotent", async () => {
  const db = await legacyDatabase();
  try {
    await db.query("insert into users (id, display_name, created_at) values ($1,$2,$3)", ["demo-tv2","TV2","2026-11-07T00:00:00Z"]);
    await db.query("insert into sessions (token_hash,user_id,expires_at) values ($1,$2,$3)", ["a".repeat(64),"demo-tv2","2026-11-08T00:00:00Z"]);
    const preview = await upgradeLegacyFoundation(db);
    assert.equal(preview.applied, false);
    assert.ok(preview.statements.length > 50);
    assert.equal((await db.query("select display_name from users")).rows[0].display_name, "TV2");
    const result = await upgradeLegacyFoundation(db, { apply: true });
    assert.equal(result.applied, true);
    assert.equal((await db.query('select "displayName" from users')).rows[0].displayName, "TV2");
    assert.equal((await db.query('select "userId" from sessions')).rows[0].userId, "demo-tv2");
    const migrationCount = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")).entries.length;
    assert.equal((await db.query("select count(*)::int as count from drizzle.__drizzle_migrations")).rows[0].count, migrationCount + 1);
    const types = await db.query("select column_name,data_type from information_schema.columns where table_name='projects' and column_name='deliverables'");
    assert.equal(types.rows[0].data_type, "jsonb");
    const second = await upgradeLegacyFoundation(db, { apply: true });
    assert.equal(second.alreadyCurrent, true);
    assert.equal(second.applied, false);
  } finally { await db.close(); }
});

test("legacy upgrade refuses business data instead of rewriting a live project", async () => {
  const db = await legacyDatabase();
  try {
    await db.exec("insert into projects (id,name,goal,deliverables,deadline,time_zone) values ('preserve','Existing project','Existing goal',ARRAY['Existing output'],now()+interval '1 day','Asia/Ho_Chi_Minh')");
    await assert.rejects(upgradeLegacyFoundation(db, { apply: true }), /dữ liệu nghiệp vụ/);
    assert.equal((await db.query("select name from projects where id='preserve'")).rows[0].name, "Existing project");
    assert.equal((await db.query("select count(*)::int as count from information_schema.columns where table_name='users' and column_name='display_name'")).rows[0].count, 1);
  } finally { await db.close(); }
});

test("unknown migration history is rejected without changing columns", async () => {
  const db = await legacyDatabase("unrecognized-history");
  try {
    await assert.rejects(upgradeLegacyFoundation(db, { apply: true }), /Lịch sử DB/);
    assert.equal((await db.query("select count(*)::int as count from information_schema.columns where table_name='users' and column_name='display_name'")).rows[0].count, 1);
    assert.equal((await db.query("select count(*)::int as count from drizzle.__drizzle_migrations")).rows[0].count, 1);
  } finally { await db.close(); }
});
