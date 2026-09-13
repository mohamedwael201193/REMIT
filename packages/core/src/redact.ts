const SECRET_KEYS = [
  "mnemonic",
  "seed",
  "secret",
  "password",
  "token",
  "sk",
  "esk",
  "psk",
  "opening",
  "salt",
  "witness",
  "GITHUB_TOKEN",
  "RENDER_API_KEY",
  "VERCEL_TOKEN",
  "REMIT_OPERATOR_MNEMONIC",
  "REMIT_EXECUTOR_SECRET_HEX",
  "REMIT_AGENT_RFQ_BOX_SECRET_HEX",
  "REMIT_API_ADMIN_TOKEN",
  "REMIT_AGENT_PRIVATE_STATE_PASSWORD",
];

const SECRET_RE = new RegExp(
  `(${SECRET_KEYS.join("|")}|[a-z]+(?: [a-z]+){11,23})`,
  "i",
);

export function redact(value: unknown): unknown {
  if (typeof value === "string") {
    if (SECRET_RE.test(value) || value.split(" ").length === 24) return "[redacted]";
    return value;
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEYS.some((s) => k.toLowerCase().includes(s.toLowerCase())) ? "[redacted]" : redact(v);
    }
    return out;
  }
  return value;
}

export function safeLog(obj: unknown): string {
  return JSON.stringify(redact(obj));
}
