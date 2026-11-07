// In-process TypeScript loader for managed environments that block esbuild subprocesses.
// Type safety remains enforced separately by npm run check and npm run build.
import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import ts from "typescript";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server" || specifier === "next/headers") return nextResolve(specifier + ".js", context);
    let url;
    if (specifier.startsWith("@/")) url = pathToFileURL(resolve("src", specifier.slice(2)));
    else if (specifier.startsWith(".") && context.parentURL) url = new URL(specifier, context.parentURL);
    if (url?.protocol === "file:") {
      const path = fileURLToPath(url);
      for (const suffix of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
        if (existsSync(path + suffix)) return { url: pathToFileURL(path + suffix).href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (/\.[cm]?tsx?$/.test(url) && !url.includes("/node_modules/")) {
      const source = ts.transpileModule(readFileSync(new URL(url), "utf8"), {
        fileName: fileURLToPath(url), compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
      }).outputText;
      return { format: "module", source, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
