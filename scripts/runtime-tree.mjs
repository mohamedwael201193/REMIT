import { execSync } from "node:child_process";

function ls(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    return String(e.stdout ?? "") + String(e.stderr ?? "");
  }
}

const out = ls("npm ls --all --omit=dev @midnight-ntwrk/onchain-runtime-v3");
const versions = [...out.matchAll(/onchain-runtime-v3@([0-9.]+)/g)].map((m) => m[1]);
const uniq = [...new Set(versions)];
console.log("onchain-runtime-v3 versions:", uniq.join(", ") || "(none listed)");
if (uniq.length > 1) {
  console.error("duplicate onchain-runtime-v3 — CMA prototype mismatch risk");
  process.exit(1);
}
const banned = ["0.34.0", "5.0.0", "2.0.0-beta"];
const lock = ls("npm ls --all --omit=dev");
for (const b of banned) {
  if (lock.includes(`compactc@${b}`) || lock.includes(`midnight-js@${b}`)) {
    console.error("obsolete/unsupported Midnight version in tree:", b);
    process.exit(1);
  }
}
console.log("runtime-tree ok");
