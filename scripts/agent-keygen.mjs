import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { x25519 } from "@noble/curves/ed25519";

const esk = crypto.getRandomValues(new Uint8Array(32));
const rfq = x25519.utils.randomSecretKey();
const pub = x25519.getPublicKey(rfq);
const admin = createHash("sha256").update(crypto.getRandomValues(new Uint8Array(32))).digest("hex");
const lines = [
  `REMIT_EXECUTOR_SECRET_HEX=${Buffer.from(esk).toString("hex")}`,
  `REMIT_AGENT_RFQ_BOX_SECRET_HEX=${Buffer.from(rfq).toString("hex")}`,
  `REMIT_AGENT_RFQ_BOX_PUBLIC_HEX=${Buffer.from(pub).toString("hex")}`,
  `REMIT_API_ADMIN_TOKEN=${admin}`,
];
writeFileSync("agent-keys.generated.env", lines.join("\n") + "\n");
console.log("wrote agent-keys.generated.env (gitignored pattern *.generated.env — add to .env.preprod.local manually)");
console.log("generated keys: executor, rfq box, admin token (values not printed)");
