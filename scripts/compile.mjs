import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skipZk = process.argv.includes("--skip-zk");
const extra = skipZk ? ["--skip-zk"] : [];

/** Map a Windows path to the WSL mount so a judge checkout can live anywhere. */
function windowsToWsl(p) {
  const abs = resolve(p);
  const m = /^([A-Za-z]):[\\/](.*)$/.exec(abs);
  if (!m) return abs.replaceAll("\\", "/");
  return `/mnt/${m[1].toLowerCase()}/${m[2].replaceAll("\\", "/")}`;
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
  const wslRoot = windowsToWsl(root);
  const wslSrc = windowsToWsl(resolve(root, src));
  const wslOut = windowsToWsl(resolve(root, out));
  const flags = extra.length ? `${extra.join(" ")} ` : "";
  const cmd = `compact compile ${flags}"${wslSrc}" "${wslOut}"`;
  console.log(cmd);
  const r = spawnSync("wsl", ["-e", "bash", "-lc", `cd "${wslRoot}" && ${cmd}`], {
    stdio: "inherit",
    windowsHide: true,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function compile(src, out) {
  // Windows: Compact runs in WSL only. Node/npm stay on Windows.
  if (process.platform === "win32") {
    compileWsl(src, out);
    return;
  }
  compileNative(src, out);
}

compile("CONTRACT/src/remit_pool.compact", "CONTRACT/managed/remit_pool");
compile("CONTRACT/src/remit_quote.compact", "CONTRACT/managed/remit_quote");
console.log(skipZk ? "compile complete (skip-zk; not a full ZK compile)" : "compile complete");
