import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const banned = [
  "NightPool",
  "DarkStake",
  "Darkstake",
  "TacitPay",
  "ShadowPayroll",
  "EduProof",
  "Candor",
  "Kikin",
  "Mid Skills",
  "MidSkills",
  "competitor",
  "first ever",
  "first-ever",
  "game-changing",
  "revolutionary",
];

const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === "dist" || name === ".next") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(md|tsx|ts|mjs|js)$/.test(name)) files.push(p);
  }
}

const roots = [
  join(root, "README.md"),
  join(root, "PLAN.md"),
  join(root, "ABOUT.md"),
  join(root, "scripts", "judge-proof.ts"),
  join(root, "front", "src", "components", "remit", "landing"),
];
for (const p of roots) {
  try {
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else files.push(p);
  } catch {
    console.error("missing", p);
    process.exit(1);
  }
}

let hits = 0;
for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const word of banned) {
    const re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (re.test(text)) {
      console.error(`public-doc-scan: ${relative(root, file)} contains "${word}"`);
      hits++;
    }
  }
}
if (hits) {
  console.error(`public-doc-scan failed (${hits} hits)`);
  process.exit(1);
}
console.log(`public-doc-scan ok (${files.length} files)`);
