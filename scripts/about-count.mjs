import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const text = readFileSync(join(root, "ABOUT.md"), "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
const n = [...text].length;
console.log(`ABOUT_CHAR_COUNT=${n}`);
if (n < 5400 || n > 5980) {
  console.error(`ABOUT.md must be 5400-5980 characters (target 5600-5750). got ${n}`);
  process.exit(1);
}
if (n < 5600 || n > 5750) {
  console.error(`ABOUT.md is in the hard range but outside the 5600-5750 target. got ${n}`);
  process.exit(1);
}
console.log("ABOUT.md character gate ok");
