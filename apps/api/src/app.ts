import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import staticPlugin from "@fastify/static";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  EXECUTOR_VISIBILITY,
  openJson,
  publicErrorMessage,
  rfqPublicFromSecret,
  verifyDisclosure,
  fetchBlock,
  assertLedger8,
} from "@remit/core";

export type ApiConfig = {
  cors: string;
  admin: string;
  rfqSk: string;
  execSk: string;
  pool: string;
  quote: string;
  network: string;
  indexer: string;
  keysDir?: string;
};

type InboxItem = { id: string; boxed: string; receivedAt: number; nonce?: string };

export async function buildApp(cfg: ApiConfig) {
  const offers: InboxItem[] = [];
  const mandates: InboxItem[] = [];
  const receipts = new Map<string, string>();
  const nonces = new Set<string>();

  const app = Fastify({ logger: false });
  await app.register(helmet, { global: true, contentSecurityPolicy: false });
  await app.register(cors, { origin: cfg.cors === "*" ? true : cfg.cors.split(",") });
  await app.register(rateLimit, { max: 60, timeWindow: "1 minute" });

  const managedRoots = [
    resolve(process.cwd(), "CONTRACT/managed"),
    resolve(process.cwd(), "../../CONTRACT/managed"),
    resolve(process.cwd(), "../CONTRACT/managed"),
  ];
  const managedRoot = cfg.keysDir
    ? resolve(cfg.keysDir, "..")
    : managedRoots.find((p) => existsSync(p));
  const keyHeaders = (res: { setHeader: (k: string, v: string) => void }) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  };
  if (managedRoot) {
    const poolKeys = resolve(managedRoot, "remit_pool/keys");
    const quoteKeys = resolve(managedRoot, "remit_quote/keys");
    if (existsSync(poolKeys)) {
      await app.register(staticPlugin, {
        root: poolKeys,
        prefix: "/keys/",
        decorateReply: false,
        setHeaders: keyHeaders,
      });
    }
    if (existsSync(quoteKeys)) {
      await app.register(staticPlugin, {
        root: quoteKeys,
        prefix: "/keys/quote/",
        decorateReply: false,
        setHeaders: keyHeaders,
      });
    }
  }

  app.get("/health", async () => {
    let block: { height: number; protocolVersion: number } | null = null;
    try {
      const b = await fetchBlock(cfg.indexer);
      assertLedger8(b);
      block = { height: b.height, protocolVersion: b.protocolVersion };
    } catch {
      block = null;
    }
    return {
      ok: true,
      network: cfg.network,
      pool: cfg.pool,
      quote: cfg.quote,
      indexer: cfg.indexer,
      rfqPublic: cfg.rfqSk ? rfqPublicFromSecret(cfg.rfqSk) : null,
      inbox: { offers: offers.length, mandates: mandates.length },
      visibility: EXECUTOR_VISIBILITY.model,
      mpc: false,
      dustGate: "availableCoins>=1",
      block,
    };
  });

  app.get("/stats", async () => ({
    network: cfg.network,
    pool: cfg.pool,
    offersQueued: offers.length,
    mandatesQueued: mandates.length,
  }));

  app.post("/rfq/offer", async (req, reply) => {
    const body = req.body as { box?: string };
    if (!body?.box || typeof body.box !== "string" || body.box.length > 16_384) {
      return reply.code(400).send({ error: "invalid box" });
    }
    if (cfg.rfqSk) {
      try {
        const opened = openJson<{ nonce?: string; expiresAt?: number; kind?: string }>(cfg.rfqSk, body.box);
        if (opened.kind && opened.kind !== "offer") return reply.code(400).send({ error: "not an offer" });
        if (opened.expiresAt && opened.expiresAt < Date.now()) return reply.code(400).send({ error: "expired" });
        if (opened.nonce) {
          if (nonces.has(opened.nonce)) return reply.code(409).send({ error: "replay" });
          nonces.add(opened.nonce);
        }
      } catch {
        return reply.code(400).send({ error: "unseal failed" });
      }
    }
    const id = `${Date.now()}-${offers.length}`;
    offers.push({ id, boxed: body.box, receivedAt: Date.now() });
    return { id };
  });

  app.post("/mandate", async (req, reply) => {
    const body = req.body as { box?: string };
    if (!body?.box || typeof body.box !== "string" || body.box.length > 16_384) {
      return reply.code(400).send({ error: "invalid box" });
    }
    if (cfg.rfqSk) {
      try {
        const opened = openJson<{ nonce?: string; expiresAt?: number; kind?: string }>(cfg.rfqSk, body.box);
        if (opened.kind && opened.kind !== "mandate") return reply.code(400).send({ error: "not a mandate" });
        if (opened.expiresAt && opened.expiresAt < Date.now()) return reply.code(400).send({ error: "expired" });
        if (opened.nonce) {
          if (nonces.has(opened.nonce)) return reply.code(409).send({ error: "replay" });
          nonces.add(opened.nonce);
        }
      } catch {
        return reply.code(400).send({ error: "unseal failed" });
      }
    }
    const id = `m-${Date.now()}`;
    mandates.push({ id, boxed: body.box, receivedAt: Date.now() });
    return { id };
  });

  app.get("/receipts/:key", async (req, reply) => {
    const key = (req.params as { key: string }).key;
    const boxed = receipts.get(key);
    if (!boxed) return reply.code(404).send({ error: "not found" });
    return { box: boxed };
  });

  app.post("/disclose", async (req, reply) => {
    const token = String((req.headers.authorization ?? "").replace(/^Bearer\s+/i, ""));
    if (!cfg.admin || token !== cfg.admin) return reply.code(401).send({ error: "unauthorized" });
    const body = req.body as { package?: Parameters<typeof verifyDisclosure>[0]; rootHex?: string };
    if (!body?.package || !body.rootHex) return reply.code(400).send({ error: "invalid package" });
    const root = Uint8Array.from(Buffer.from(body.rootHex, "hex"));
    return verifyDisclosure(body.package, root);
  });

  app.post("/agent/rank", async (_req, reply) =>
    reply.code(501).send({ error: "fill is executed by the operator process, not this HTTP path" }),
  );

  app.setErrorHandler((err, _req, reply) => {
    reply.code(500).send({ error: publicErrorMessage(err) });
  });

  return { app, offers, mandates, receipts };
}
