import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "../..");
const apiSource = fs.readFileSync(path.join(root, "backend/api_main.py"), "utf8");
const routes = [...apiSource.matchAll(/@app\.(get|post|patch|put|delete)\(\s*"([^"]+)"/g)]
  .map((match) => ({ method: match[1].toUpperCase(), path: match[2] }));
const methods = { apiGet: "GET", apiPost: "POST", apiPatch: "PATCH", apiPut: "PUT", apiDelete: "DELETE" };
const calls = [];
const indirect = [];
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((item) => {
    const file = path.join(directory, item.name);
    return item.isDirectory() ? files(file) : /\.tsx?$/.test(file) ? [file] : [];
  });
}
function template(node) {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) return node.head.text + node.templateSpans.map((span) => `{parameter}${span.literal.text}`).join("");
  return null;
}
for (const file of files(path.join(root, "frontend/src"))) {
  if (file.endsWith("/lib/api/client.ts")) continue;
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (ts.isCallExpression(node)) {
      const name = node.expression.getText(source);
      const method = methods[name] ?? (/^api\.(get|post|patch|put|delete)$/.test(name) ? name.split(".")[1].toUpperCase() : null);
      if (method) {
        const endpoint = template(node.arguments[0]);
        const location = `${path.relative(root, file)}:${source.getLineAndCharacterOfPosition(node.pos).line + 1}`;
        if (endpoint?.startsWith("/api/")) calls.push({ method, path: endpoint.split("?")[0], location });
        else indirect.push(location);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
function compatible(left, right) {
  const a = left.split("/"); const b = right.split("/");
  return a.length === b.length && a.every((part, index) => part === b[index] || /^\{[^}]+\}$/.test(part) || /^\{[^}]+\}$/.test(b[index]));
}
const missing = calls.filter((call) => !routes.some((route) => route.method === call.method && compatible(route.path, call.path)));
for (const call of missing) console.error(`Missing backend route: ${call.method} ${call.path} (${call.location})`);
// Indirect wrappers require explicit tests; never silently claim they were checked.
console.log(`Checked ${calls.length} frontend call sites against ${routes.length} backend routes. ${indirect.length} indirect call sites require behavioral coverage.`);
for (const location of indirect) console.log(`Indirect: ${location}`);
if (missing.length || !calls.length) process.exitCode = 1;
