import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";

const cache = path.resolve(".cache/drizzle-schema");
fs.mkdirSync(cache, { recursive: true });
const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
fs.writeFileSync(path.join(cache, "enums.cjs"), compile(fs.readFileSync("src/contracts/enums.ts", "utf8")));
const schemaCode = compile(fs.readFileSync("src/server/db/schema/index.ts", "utf8")).replaceAll('require("@/contracts/enums")', 'require("./enums.cjs")');
fs.writeFileSync(path.join(cache, "schema.cjs"), schemaCode);
const schema = createRequire(import.meta.url)(path.join(cache, "schema.cjs"));
const meta = path.resolve("drizzle/meta");
const journalPath = path.join(meta, "_journal.json");
const journal = fs.existsSync(journalPath) ? JSON.parse(fs.readFileSync(journalPath, "utf8")) : { version: "7", dialect: "postgresql", entries: [] };
const last = journal.entries.at(-1);
const previous = last ? JSON.parse(fs.readFileSync(path.join(meta, String(last.idx).padStart(4, "0") + "_snapshot.json"), "utf8")) : { ...generateDrizzleJson({}), id: "00000000-0000-0000-0000-000000000000" };
const current = generateDrizzleJson(schema, previous.id);
const statements = await generateMigration(previous, current);
if (!statements.length) {
  console.log("Schema không thay đổi; không tạo migration mới.");
} else {
  const index = (last?.idx ?? -1) + 1;
  const name = process.argv[2] ?? "tracking_foundation";
  if (!/^[a-z0-9_]+$/.test(name)) throw new Error("Tên migration chỉ dùng chữ thường, số và gạch dưới.");
  const prefix = String(index).padStart(4, "0");
  const tag = prefix + "_" + name;
  fs.mkdirSync(meta, { recursive: true });
  fs.writeFileSync("drizzle/" + tag + ".sql", statements.join("\n--> statement-breakpoint\n") + "\n", { flag: "wx" });
  fs.writeFileSync(path.join(meta, prefix + "_snapshot.json"), JSON.stringify(current, null, 2) + "\n", { flag: "wx" });
  journal.entries.push({ idx: index, version: current.version, when: Date.now(), tag, breakpoints: true });
  fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2) + "\n");
  console.log("Đã tạo " + tag + " bằng Drizzle Kit API; không kết nối database.");
}
