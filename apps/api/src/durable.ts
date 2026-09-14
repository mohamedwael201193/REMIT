import dns from "node:dns";
import postgres from "postgres";
import {
  decryptInbox,
  encryptInbox,
  loadInbox,
  saveInbox,
  type InboxSnapshot,
} from "@remit/core";

dns.setDefaultResultOrder("ipv4first");

/** Strip Prisma/supabase-js query flags and pass discrete fields so `@` in passwords cannot split the host. */
function pgClient(databaseUrl: string) {
  const u = new URL(databaseUrl);
  u.searchParams.delete("pgbouncer");
  return postgres({
    host: u.hostname,
    port: Number(u.port || 5432),
    database: decodeURIComponent((u.pathname || "/postgres").replace(/^\//, "") || "postgres"),
    username: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    ssl: "require",
    prepare: false,
    max: 1,
    connect_timeout: 15,
    idle_timeout: 20,
    connection: { application_name: "remit-api" },
    onnotice: () => undefined,
  });
}

export type PersistBackend = "supabase" | "file" | "memory";

export type DurableInbox = {
  backend: PersistBackend;
  load: () => Promise<InboxSnapshot>;
  save: (snap: InboxSnapshot) => Promise<void>;
  ping: () => Promise<boolean>;
  close: () => Promise<void>;
};

const SNAPSHOT_KIND = "snapshot";
const SNAPSHOT_NONCE = "inbox-v1";
const EMPTY: InboxSnapshot = { v: 1, offers: [], mandates: [], nonces: [], receipts: [] };

export function remitEnvelopeSchema(): string {
  return `
CREATE TABLE IF NOT EXISTS remit_envelopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  owner_binding text,
  nonce text,
  ciphertext text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  UNIQUE (kind, nonce)
);
CREATE INDEX IF NOT EXISTS remit_envelopes_kind_owner ON remit_envelopes (kind, owner_binding);
ALTER TABLE remit_envelopes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE remit_envelopes FROM PUBLIC;
DO $$ BEGIN
  REVOKE ALL ON TABLE remit_envelopes FROM anon;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE ALL ON TABLE remit_envelopes FROM authenticated;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY remit_envelopes_deny_anon ON remit_envelopes FOR ALL TO anon USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY remit_envelopes_deny_authenticated ON remit_envelopes FOR ALL TO authenticated USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;
`.trim();
}

export async function ensureRemitSchema(databaseUrl: string): Promise<void> {
  const sql = pgClient(databaseUrl);
  try {
    await sql.unsafe(remitEnvelopeSchema());
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export function createDurableInbox(opts: {
  password: string;
  file?: string;
  databaseUrl?: string;
  memory?: boolean;
  /** Override only in tests. Production API always uses inbox-v1. */
  snapshotNonce?: string;
}): DurableInbox {
  if (opts.memory) {
    let snap: InboxSnapshot = { ...EMPTY, offers: [], mandates: [], nonces: [], receipts: [] };
    return {
      backend: "memory",
      load: async () => structuredClone(snap),
      save: async (next) => {
        snap = structuredClone(next);
      },
      ping: async () => true,
      close: async () => undefined,
    };
  }
  if (opts.databaseUrl) {
    const sql = pgClient(opts.databaseUrl);
    const snapshotNonce = opts.snapshotNonce || SNAPSHOT_NONCE;
    let ready = false;
    const ensure = async () => {
      if (ready) return;
      await sql.unsafe(remitEnvelopeSchema());
      ready = true;
    };
    return {
      backend: "supabase",
      ping: async () => {
        try {
          await ensure();
          await sql`select 1 as ok`;
          return true;
        } catch {
          return false;
        }
      },
      load: async () => {
        await ensure();
        const rows = await sql<{ ciphertext: string }[]>`
          select ciphertext from remit_envelopes
          where kind = ${SNAPSHOT_KIND} and nonce = ${snapshotNonce}
          limit 1
        `;
        const ct = rows[0]?.ciphertext;
        if (!ct) return { ...EMPTY, offers: [], mandates: [], nonces: [], receipts: [] };
        return decryptInbox(Buffer.from(ct, "base64"), opts.password);
      },
      save: async (snap) => {
        await ensure();
        const ciphertext = encryptInbox(snap, opts.password).toString("base64");
        await sql`
          insert into remit_envelopes (kind, owner_binding, nonce, ciphertext, meta)
          values (${SNAPSHOT_KIND}, ${"operator"}, ${snapshotNonce}, ${ciphertext}, ${sql.json({ v: 1 })})
          on conflict (kind, nonce) do update set
            ciphertext = excluded.ciphertext,
            updated_at = now(),
            version = remit_envelopes.version + 1
        `;
        for (const item of snap.offers) {
          await sql`
            insert into remit_envelopes (kind, owner_binding, nonce, ciphertext, meta)
            values (${"rfq"}, ${"executor"}, ${item.id}, ${item.boxed}, ${sql.json({ receivedAt: item.receivedAt })})
            on conflict (kind, nonce) do update set
              ciphertext = excluded.ciphertext,
              updated_at = now(),
              version = remit_envelopes.version + 1
          `;
        }
        for (const item of snap.mandates) {
          await sql`
            insert into remit_envelopes (kind, owner_binding, nonce, ciphertext, meta)
            values (${"mandate"}, ${"executor"}, ${item.id}, ${item.boxed}, ${sql.json({ receivedAt: item.receivedAt })})
            on conflict (kind, nonce) do update set
              ciphertext = excluded.ciphertext,
              updated_at = now(),
              version = remit_envelopes.version + 1
          `;
        }
      },
      close: async () => {
        await sql.end({ timeout: 5 });
      },
    };
  }
  const file = opts.file;
  if (!file) {
    throw new Error("durable inbox requires DATABASE_URL or inboxFile");
  }
  return {
    backend: "file",
    ping: async () => true,
    load: async () => loadInbox(file, opts.password),
    save: async (snap) => saveInbox(file, opts.password, snap),
    close: async () => undefined,
  };
}
