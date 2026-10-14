#!/usr/bin/env node
// Layout regression test: node test.mjs [--update]
// Renders ../example.yaml and test/*.yaml, compares each layout score with test/scores.json,
// and checks that invalid specs are rejected. --update rewrites the snapshot after an
// intended change to layout or scoring (look at the renders before committing it).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ELK from "elkjs/lib/elk.bundled.js";
import * as yaml from "js-yaml";
import { createEngine } from "./engine.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const snapPath = path.join(here, "test", "scores.json");
const update = process.argv.includes("--update");
const eng = createEngine({ ELK });
let failed = 0;
const fail = (msg) => { failed++; console.log("FAIL " + msg); };

// ---------- layout snapshots ----------
const specs = { example: path.join(here, "..", "example.yaml") };
for (const f of fs.readdirSync(path.join(here, "test")).filter((f) => f.endsWith(".yaml")).sort())
  specs[f.replace(/\.yaml$/, "")] = path.join(here, "test", f);

const got = {};
for (const [name, file] of Object.entries(specs)) {
  const { best } = await eng.layout(yaml.load(fs.readFileSync(file, "utf8")));
  got[name] = best.s;
}
if (update) {
  fs.writeFileSync(snapPath, JSON.stringify(got, null, 2) + "\n");
  console.log(`updated ${path.relative(process.cwd(), snapPath)}`);
} else {
  const want = fs.existsSync(snapPath) ? JSON.parse(fs.readFileSync(snapPath, "utf8")) : {};
  for (const [name, s] of Object.entries(got)) {
    if (!want[name]) { fail(`${name}: no snapshot (run with --update)`); continue; }
    const diff = Object.keys({ ...s, ...want[name] }).filter((k) => s[k] !== want[name][k]);
    if (diff.length) fail(`${name}: ${diff.map((k) => `${k} ${want[name][k]} -> ${s[k]}`).join(", ")}`);
    else console.log(`ok   ${name} (score ${s.total}, ${s.W}x${s.H})`);
  }
}

// ---------- validation ----------
const rejects = {
  "missing role": { nodes: { a: { label: "A" } } },
  "unknown role": { nodes: { a: { label: "A", role: "database" } } },
  "missing label": { nodes: { a: { label: "A", role: "client" }, b: { label: "B", role: "core" } }, edges: [["a", "b"]] },
  "unknown id": { nodes: { a: { label: "A", role: "client" } }, edges: [["a", "zz", "Calls"]] },
  "unknown group": { nodes: { a: { label: "A", role: "client", group: "g" } } },
  "unknown theme": { theme: "neon", nodes: { a: { label: "A", role: "client" } } },
};
for (const [what, spec] of Object.entries(rejects)) {
  try { await eng.layout(spec); fail(`${what}: spec was accepted`); }
  catch { console.log(`ok   rejects ${what}`); }
}

if (failed) { console.log(`\n${failed} failure(s)`); process.exit(1); }
