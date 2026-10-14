#!/usr/bin/env node
// Opens flow-diagram.html in the browser with a spec preloaded: node open.mjs spec.yaml [--print]
// The spec travels in the URL fragment (#spec=<deflate-raw, base64url>), so nothing is uploaded
// and no server is needed. Uses only Node built-ins: no npm install required.
//
// Opening a file:// URL through the OS (start / open / explorer.exe) drops the #fragment, so we
// open a tiny launcher page in the temp dir that redirects to the tool with the fragment intact.
// --print only prints the URL (paste it into the browser's address bar).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const [specPath, ...flags] = process.argv.slice(2);
if (!specPath) { console.error("usage: open.mjs spec.yaml [--print]"); process.exit(2); }

const encodeSpec = (text) => zlib.deflateRawSync(Buffer.from(text, "utf8"), { level: 9 }).toString("base64url");

const wsl = process.platform === "linux" && /microsoft/i.test(fs.readFileSync("/proc/version", "utf8"));
// file:// URL the *browser* can open. Under WSL the browser runs on Windows, so go through \\wsl.localhost.
function browserURL(p) {
  if (!wsl) return pathToFileURL(p).href;
  const win = execFileSync("wslpath", ["-w", p], { encoding: "utf8" }).trim();
  return "file:" + win.replace(/\\/g, "/").split("/").map(encodeURIComponent).join("/").replace(/%3A/g, ":");
}

const tool = path.join(here, "..", "flow-diagram.html");
if (!fs.existsSync(tool)) { console.error(`missing ${tool} (run npm run build in src/)`); process.exit(1); }
const url = `${browserURL(tool)}#spec=${encodeSpec(fs.readFileSync(specPath, "utf8"))}`;

if (flags.includes("--print")) { console.log(url); process.exit(0); }

const launcher = path.join(os.tmpdir(), `flowdiag-${path.basename(specPath).replace(/\.ya?ml$/i, "")}.html`);
fs.writeFileSync(launcher, `<!doctype html><meta charset="utf-8"><title>Opening flow-diagram…</title>
<script>location.replace(${JSON.stringify(url)});</script>
<p>Opening the diagram tool… If nothing happens, <a href=${JSON.stringify(url)}>click here</a>.</p>\n`);

const opener =
  wsl ? ["explorer.exe", [execFileSync("wslpath", ["-w", launcher], { encoding: "utf8" }).trim()]]
  : process.platform === "win32" ? ["cmd", ["/c", "start", "", launcher]]
  : process.platform === "darwin" ? ["open", [launcher]]
  : ["xdg-open", [launcher]];
spawn(opener[0], opener[1], { detached: true, stdio: "ignore" })
  .on("spawn", () => console.log(`opened ${path.basename(specPath)} in flow-diagram.html`))
  .on("error", () => console.log("could not open a browser; paste this URL into one:\n" + url))
  .unref();
