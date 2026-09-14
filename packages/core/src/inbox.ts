import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { RemitError } from "./errors.js";

export type InboxItem = { id: string; boxed: string; receivedAt: number; nonce?: string };

export type InboxSnapshot = {
  v: 1;
  offers: InboxItem[];
  mandates: InboxItem[];
  nonces: string[];
  receipts: [string, string][];
};

const EMPTY: InboxSnapshot = { v: 1, offers: [], mandates: [], nonces: [], receipts: [] };

function keyFromPassword(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, 32);
}

export function encryptInbox(snap: InboxSnapshot, password: string): Buffer {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = keyFromPassword(password, salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const pt = Buffer.from(JSON.stringify(snap), "utf8");
  const ct = Buffer.concat([cipher.update(pt), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from("RMTI1"), salt, iv, tag, ct]);
}

export function decryptInbox(blob: Buffer, password: string): InboxSnapshot {
  if (blob.subarray(0, 5).toString() !== "RMTI1") throw new RemitError("CONFIG", "bad inbox header");
  const salt = blob.subarray(5, 21);
  const iv = blob.subarray(21, 33);
  const tag = blob.subarray(33, 49);
  const ct = blob.subarray(49);
  const key = keyFromPassword(password, salt);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  const parsed = JSON.parse(pt.toString("utf8")) as InboxSnapshot;
  if (parsed.v !== 1) throw new RemitError("CONFIG", "unsupported inbox version");
  return parsed;
}

export function loadInbox(file: string, password: string): InboxSnapshot {
  if (!existsSync(file)) return { ...EMPTY, offers: [], mandates: [], nonces: [], receipts: [] };
  return decryptInbox(readFileSync(file), password);
}

export function saveInbox(file: string, password: string, snap: InboxSnapshot): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, encryptInbox(snap, password));
}
