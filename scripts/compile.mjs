import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skipZk = process.argv.includes("--skip-zk");
const extra = skipZk ? ["--skip-zk"] : [];

function compile(src, out) {
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

compile("CONTRACT/src/remit_pool.compact", "CONTRACT/managed/remit_pool");
compile("CONTRACT/src/remit_quote.compact", "CONTRACT/managed/remit_quote");
console.log("compile complete");
