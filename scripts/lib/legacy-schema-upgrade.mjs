import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { readMigrationFiles } from "drizzle-orm/migrator";

const quote = name => '"' + name.replaceAll('"', '""') + '"';
const snake = name => name.replace(/[A-Z]/g, letter => "_" + letter.toLowerCase());
const legacyName = name => name === "mutation_results" ? "mutation_requests" : name;
const countsFor = async (client, tables) => Object.fromEntries(await Promise.all(tables.map(async name => {
  const result = await client.query("select count(*)::text as count from public." + quote(name));
  return [name, result.rows[0].count];
})));

export async function upgradeLegacyFoundation(client, { apply = false, migrationsFolder = "./drizzle" } = {}) {
  const migrations = readMigrationFiles({ migrationsFolder });
  if (migrations.length !== 3) throw new Error("Chỉ hỗ trợ đúng ba migration hiện hành; cần review lại khi journal thay đổi.");
  const legacySql = readFileSync(migrationsFolder + "/0000_tracking_foundation.sql", "utf8");
  const legacyHashes = new Set([legacySql, legacySql.replaceAll("\r\n", "\n")].map(text => createHash("sha256").update(text).digest("hex")));
  const baseSql = readFileSync(migrationsFolder + "/0000_rare_logan.sql", "utf8");
  const statements = baseSql.split("--> statement-breakpoint").map(text => text.trim()).filter(Boolean);
  const tableDefinitions = statements.filter(text => text.startsWith("CREATE TABLE ")).map(text => {
    const match = /^CREATE TABLE "([a-z_]+)" \(([\s\S]*)\);$/.exec(text);
    if (!match) throw new Error("Định dạng migration baseline không được nhận diện.");
    return {
      name: match[1],
      columns: [...match[2].matchAll(/^\s*"([^"]+)"\s+/gm)].map(item => item[1]),
      constraints: [...match[2].matchAll(/^\s*CONSTRAINT "([^"]+)" (.+?)(?:,)?$/gm)].map(item => ({ name: item[1], sql: item[2].replace(/,$/, "") })),
    };
  });
  if (tableDefinitions.length !== 12) throw new Error("Baseline phải có đúng 12 bảng đã review.");
  await client.query("begin");
  try {
    await client.query("select pg_advisory_xact_lock(hashtextextended('teamflow:legacy-schema-upgrade', 0))");
    const history = (await client.query("select hash, created_at from drizzle.__drizzle_migrations order by created_at")).rows;
    if (migrations.every(migration => history.some(row => row.hash === migration.hash))) {
      await client.query("rollback");
      return { alreadyCurrent: true, applied: false, statements: [], preservedCounts: null };
    }
    if (history.length !== 1 || !legacyHashes.has(history[0].hash)) throw new Error("Lịch sử DB không đúng foundation cũ; không tự sửa hoặc đánh dấu migration khác.");
    const oldTables = tableDefinitions.map(table => legacyName(table.name));
    await client.query("lock table " + oldTables.map(name => "public." + quote(name)).join(", ") + " in access exclusive mode");
    const beforeCounts = await countsFor(client, oldTables);
    if (oldTables.some(table => table !== "users" && table !== "sessions" && beforeCounts[table] !== "0")) {
      throw new Error("DB đã có dữ liệu nghiệp vụ; cần kế hoạch chuyển đổi riêng, không tự nâng cấp.");
    }
    const usersBefore = (await client.query('select id, display_name as "displayName", created_at as "createdAt" from users order by id')).rows;
    const columns = (await client.query("select table_name, column_name, data_type from information_schema.columns where table_schema = 'public'")).rows;
    const constraintRows = (await client.query("select c.relname as table_name, con.conname as name from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'")).rows;
    const existingConstraints = new Set(constraintRows.map(row => (row.table_name === "mutation_requests" ? "mutation_results" : row.table_name) + "." + row.name));
    const plan = ['alter table public."mutation_requests" rename to "mutation_results";'];
    for (const table of tableDefinitions) {
      const existing = columns.filter(column => column.table_name === legacyName(table.name));
      for (const name of table.columns) {
        if (existing.some(column => column.column_name === name)) continue;
        const oldName = snake(name);
        if (!existing.some(column => column.column_name === oldName)) throw new Error("Thiếu cột yêu cầu ở " + table.name + "." + name);
        plan.push("alter table public." + quote(table.name) + " rename column " + quote(oldName) + " to " + quote(name) + ";");
      }
    }
    for (const [table, column] of [["projects","deliverables"],["project_members","skills"],["tasks","dependencyTaskIds"],["messages","candidateTaskIds"]]) {
      const old = columns.find(item => item.table_name === table && item.column_name === snake(column));
      if (!old || old.data_type !== "ARRAY") throw new Error("Kiểu dữ liệu legacy không được nhận diện ở " + table + "." + column);
      plan.push("alter table public." + quote(table) + " alter column " + quote(column) + " drop default;");
      plan.push("alter table public." + quote(table) + " alter column " + quote(column) + " type jsonb using to_jsonb(" + quote(column) + ");");
    }
    for (const [table, column] of [["plans","status"],["messages","resolution"],["submissions","contentType"]]) {
      plan.push("alter table public." + quote(table) + " alter column " + quote(column) + " drop default;");
      plan.push("alter table public." + quote(table) + " alter column " + quote(column) + " type text using " + quote(column) + "::text;");
    }
    for (const table of tableDefinitions) {
      for (const constraint of table.constraints) {
        if (!existingConstraints.has(table.name + "." + constraint.name)) {
          plan.push("alter table public." + quote(table.name) + " add constraint " + quote(constraint.name) + " " + constraint.sql + ";");
        }
      }
    }
    plan.push(...statements.filter(text => text.startsWith("ALTER TABLE ") || text.startsWith("CREATE INDEX ") || text.startsWith("CREATE UNIQUE INDEX ")));
    plan.push(...migrations.slice(1).flatMap(migration => migration.sql).filter(text => text.trim()));
    if (!apply) {
      await client.query("rollback");
      return { alreadyCurrent: false, applied: false, statements: plan, preservedCounts: beforeCounts };
    }
    for (const statement of plan) await client.query(statement);
    const afterCounts = await countsFor(client, tableDefinitions.map(table => table.name));
    for (const table of tableDefinitions) if (afterCounts[table.name] !== beforeCounts[legacyName(table.name)]) throw new Error("Số bản ghi thay đổi; rollback để bảo toàn dữ liệu.");
    const usersAfter = (await client.query('select id, "displayName", "createdAt" from users order by id')).rows;
    if (JSON.stringify(usersBefore) !== JSON.stringify(usersAfter)) throw new Error("Dữ liệu User thay đổi; rollback để bảo toàn.");
    for (const migration of migrations) await client.query("insert into drizzle.__drizzle_migrations (hash, created_at) values ($1,$2)", [migration.hash, migration.folderMillis]);
    await client.query("commit");
    return { alreadyCurrent: false, applied: true, statements: plan, preservedCounts: afterCounts };
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}
