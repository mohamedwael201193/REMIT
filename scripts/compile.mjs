import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skipZk = process.argv.includes("--skip-zk");
const extra = skipZk ? ["--skip-zk"] : [];

function compactAvailable() {
  const r = spawnSync("compact", ["compile", "--version"], { encoding: "utf8", windowsHide: true });
  return r.status === 0;
}

function compileNative(src, out) {
  mkdirSync(out, { recursive: true });
  const args = ["compile", ...extra, src, out];
  console.log(`compact ${args.join(" ")}`);
  const r = spawnSync("compact", args, { cwd: root, stdio: "inherit", windowsHide: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function compileWsl(src, out) {
  mkdirSync(out, { recursive: true });
  const wslSrc = "/mnt/d/route/midnight/REMIT/" + src.replaceAll("\\", "/");
  const wslOut = "/mnt/d/route/midnight/REMIT/" + out.replaceAll("\\", "/");
  const cmd = `compact compile ${extra.join(" ")} ${wslSrc} ${wslOut}`.replace(/\s+/g, " ");
  console.log(cmd);
  const r = spawnSync("wsl", ["-e", "bash", "-lc", `cd /mnt/d/route/midnight/REMIT && ${cmd}`], {
    stdio: "inherit",
    windowsHide: true,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function compile(src, out) {
  if (process.platform !== "win32" || compactAvailable()) {
    compileNative(src, out);
    return;
  }
  compileWsl(src, out);
}

compile("CONTRACT/src/remit_pool.compact", "CONTRACT/managed/remit_pool");
compile("CONTRACT/src/remit_quote.compact", "CONTRACT/managed/remit_quote");
console.log("compile complete");
