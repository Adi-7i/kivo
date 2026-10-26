/** Audit literal user-facing JSX copy; no environment or backend access. */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath, URL as NodeURL } from "node:url";
import { createRequire } from "node:module";
const root = fileURLToPath(new NodeURL("../../", import.meta.url));
const require = createRequire(
  new NodeURL("../../kivo-frontend/package.json", import.meta.url),
);
const ts = require("typescript");
const pattern =
  /Django|PostgreSQL|Supabase|Phase [1-7]|authoritative|integer paise|\bbackend\b|\bfrontend\b|\bAPI\b|\bledger\b|\bFIFO\b|\bserver\b|integration|preview|append.only|schema|endpoint|idempotenc/i;
export function auditUICopy() {
  const findings = [];
  function walk(directory) {
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      if (["test", "data"].includes(item.name)) continue;
      const path = join(directory, item.name);
      if (item.isDirectory()) {
        walk(path);
        continue;
      }
      if (!path.endsWith(".tsx")) continue;
      const source = ts.createSourceFile(
        path,
        readFileSync(path, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      function visit(node) {
        const rendered =
          ts.isJsxText(node) ||
          (ts.isStringLiteral(node) &&
            (ts.isJsxAttribute(node.parent) ||
              ts.isJsxExpression(node.parent)));
        if (rendered) {
          const text = node.text.replace(/\s+/g, " ").trim();
          if (pattern.test(text))
            findings.push({
              file: relative(root, path),
              line:
                source.getLineAndCharacterOfPosition(node.getStart(source))
                  .line + 1,
              text,
            });
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
  walk(join(root, "kivo-frontend/src"));
  return findings;
}
if (resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  process.stdout.write(JSON.stringify(auditUICopy(), null, 2) + "\n");
}
