/**
 * Refuse to start midnight-local-dev while Preprod operator deploy holds :6300.
 * Clone/start is operator-driven; this script only gates the conflict.
 */
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lock = resolve(root, "deployments/operator-wallet.lock");

if (existsSync(lock)) {
  console.error("operator-wallet.lock is held. Keep Preprod DUST/deploy on :6300.");
  console.error("Start midnight-local-dev only after that process exits, in its own clone:");
  console.error("  git clone https://github.com/midnightntwrk/midnight-local-dev.git");
  console.error("  cd midnight-local-dev && npm install && npm start");
  process.exit(1);
}

console.log("No operator lock. Official local stack:");
console.log("  git clone https://github.com/midnightntwrk/midnight-local-dev.git");
console.log("  cd midnight-local-dev && npm install && npm start");
console.log("Endpoints: node :9944, indexer :8088, proof :6300 (undeployed).");
console.log("This script does not pull Docker images or start containers.");
