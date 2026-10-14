#!/usr/bin/env node
// CLI: node flowdiag.mjs spec.yaml [out_basename] [--report]
// Writes out.svg (fonts embedded) and out.drawio (editable in draw.io / LeanIX / Confluence).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ELK from "elkjs/lib/elk.bundled.js";
import * as yaml from "js-yaml";
import { createEngine } from "./engine.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const [specPath, outBase, ...flags] = process.argv.slice(2);
if (!specPath) { console.error("usage: flowdiag.mjs spec.yaml [out_basename] [--report]"); process.exit(2); }
const out = outBase && !outBase.startsWith("--") ? outBase : specPath.replace(/\.ya?ml$/, "");
if (outBase?.startsWith("--")) flags.push(outBase);

function fontCSS() {
  const f = (pkg, file, fam) => {
    const p = path.join(here, "node_modules", "@fontsource", pkg, "files", file);
    if (!fs.existsSync(p)) return "";
    return `@font-face{font-family:'${fam}';src:url(data:font/woff2;base64,${fs.readFileSync(p).toString("base64")}) format('woff2');}`;
  };
  return f("inter", "inter-latin-400-normal.woff2", "Inter") + f("jetbrains-mono", "jetbrains-mono-latin-400-normal.woff2", "JetBrains Mono");
}

const spec = yaml.load(fs.readFileSync(specPath, "utf8"));
const eng = createEngine({ ELK, weights: process.env.FLOWDIAG_WEIGHTS ? JSON.parse(process.env.FLOWDIAG_WEIGHTS) : {} });
const { alts, report } = await eng.layout(spec);
const best = alts[Math.min(alts.length, Math.max(1, parseInt(spec.layout, 10) || 1)) - 1]; // layout: N = Nth best
fs.writeFileSync(out + ".svg", eng.toSVG(best, { fontCSS: fontCSS() }));
fs.writeFileSync(out + ".drawio", eng.toDrawio(best, path.basename(out)));
const c = best.cfg;
console.log(`${best === alts[0] ? "best" : `layout ${alts.indexOf(best) + 1}`} of ${report.filter((r) => r.s).length}/${report.length}: ${c.direction} folds=[${c.folds}] ${c.placement} order=${c.modelOrder} layerGap=${c.layerGap}`);
console.log("score:", JSON.stringify(best.s));
console.log(`wrote ${out}.svg, ${out}.drawio`);
if (flags.includes("--report"))
  for (const r of report.slice(0, 12))
    console.log(r.s ? JSON.stringify(r.s) : "ERR " + r.error, "|", r.cfg.direction, "folds=" + r.cfg.folds, r.cfg.placement, r.cfg.modelOrder, r.cfg.layerGap);
