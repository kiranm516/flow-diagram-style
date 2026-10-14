// Builds a single offline HTML file: node build.mjs [example.yaml] [out.html]
import fs from "node:fs";
const ex = process.argv[2] || "example.yaml", out = process.argv[3] || "flow-diagram.html";
const r = (p) => fs.readFileSync(p, "utf8");
const b64 = (p) => fs.readFileSync(p).toString("base64");
const safe = (s) => s.replace(/<\/script/gi, "<\\/script");
const engine = r("engine.mjs").replace(/^export (function|const|async function) /gm, "$1 ");
if (/^\s*(import|export)\b/m.test(engine)) throw new Error("engine still has import/export");
let html = r("tool.template.html");
const parts = {
  "/*__ELK__*/": safe(r("node_modules/elkjs/lib/elk.bundled.js")),
  "/*__YAML__*/": safe(r("node_modules/js-yaml/dist/browser/js-yaml.umd.min.js")),
  "/*__ENGINE__*/": safe(engine),
  "__EXAMPLE__": safe(JSON.stringify(r(ex))),
  "__FONT_INTER__": b64("node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2"),
  "__FONT_MONO__": b64("node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2"),
};
for (const [k, v] of Object.entries(parts)) html = html.split(k).join(v);
fs.writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
