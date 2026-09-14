/**
 * Public Preprod smoke for Render + optional hosted frontend.
 * Success is live addresses and honest JSON — never a mocked settlement.
 */
const api = (process.env.REMIT_API_PUBLIC_URL ?? "https://remit-api-node.onrender.com").replace(/\/$/, "");
const front = (process.env.REMIT_FRONT_URL ?? "").replace(/\/$/, "");

function forbidMock(label: string, text: string) {
  const v = text.toLowerCase();
  if (v.includes("mock") || v.includes("fake success") || v.includes("simulated settlement") || v.includes("all systems operational")) {
    throw new Error(`${label} contains mock/fake production language`);
  }
}

const health = await (await fetch(`${api}/health`)).json() as {
  ok?: boolean;
  mpc?: boolean;
  dustGate?: string;
  network?: string;
  pool?: string;
  quote?: string;
};
if (!health.ok) throw new Error("health not ok");
if (health.mpc !== false) throw new Error("health must set mpc false");
if (health.dustGate !== "availableCoins>=1") throw new Error("health dustGate mismatch");
if (health.network !== "preprod") throw new Error("health network is not preprod");
forbidMock("health", JSON.stringify(health));

const config = await (await fetch(`${api}/config`)).json() as {
  live?: boolean;
  pool?: string;
  quote?: string;
  executorKey?: string | null;
};
forbidMock("config", JSON.stringify(config));

if (front) {
  const html = await (await fetch(front)).text();
  forbidMock("frontend", html);
  if (!html.toLowerCase().includes("preprod") && !html.toLowerCase().includes("remit")) {
    throw new Error("frontend host did not look like the supplied REMIT UI");
  }
}

async function hosted(url: string): Promise<boolean> {
  const head = await fetch(url, { method: "HEAD" });
  if (head.ok) return true;
  const ranged = await fetch(url, { headers: { Range: "bytes=0-31" } });
  return ranged.ok || ranged.status === 206;
}

const live = Boolean(health.pool && health.quote);
const circuitRes = await fetch(`${api}/browser/remit-circuit.js`);
const circuitText = circuitRes.ok ? await circuitRes.text() : "";
const circuit =
  circuitRes.ok && circuitText.includes("createMandateFromWallet") && circuitText.includes("revokeMandatesFromWallet");
const wasm = await hosted(`${api}/browser/midnight_ledger_wasm_bg.wasm`);
const zkir = await hosted(`${api}/zkir/deposit.zkir`);
const prover = await hosted(`${api}/keys/deposit.prover`);
const verifier = await hosted(`${api}/keys/deposit.verifier`);

console.log(
  JSON.stringify({
    api,
    live,
    pool: health.pool ?? "",
    quote: health.quote ?? "",
    executorKey: Boolean(config.executorKey),
    circuit,
    wasm,
    zkir,
    prover,
    verifier,
    front: front || null,
  }),
);
if (!live) process.exit(2);
if (!circuit || !wasm || !zkir || !prover || !verifier) process.exit(2);
