import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { emptyPrivateState, type RemitPrivateState } from "./state.js";
import { RemitError } from "./errors.js";

function keyFromPassword(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, 32);
}

export function encryptPrivateState(ps: RemitPrivateState, password: string): Buffer {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = keyFromPassword(password, salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const pt = Buffer.from(JSON.stringify(ps), "utf8");
  const ct = Buffer.concat([cipher.update(pt), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from("RMT1"), salt, iv, tag, ct]);
}

export function decryptPrivateState(blob: Buffer, password: string): RemitPrivateState {
  if (blob.subarray(0, 4).toString() !== "RMT1") throw new RemitError("CONFIG", "bad private-state header");
  const salt = blob.subarray(4, 20);
  const iv = blob.subarray(20, 32);
  const tag = blob.subarray(32, 48);
  const ct = blob.subarray(48);
  const key = keyFromPassword(password, salt);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return JSON.parse(pt.toString("utf8")) as RemitPrivateState;
}

export function loadOrCreateState(file: string, password: string, namespace: string): RemitPrivateState {
  mkdirSync(dirname(file), { recursive: true });
  if (!existsSync(file)) {
    const ps = emptyPrivateState(namespace);
    writeFileSync(file, encryptPrivateState(ps, password));
    return ps;
  }
  const ps = decryptPrivateState(readFileSync(file), password);
  if (ps.namespace !== namespace) throw new RemitError("UNAUTHORIZED", "private-state namespace mismatch");
  return ps;
}

export function saveState(file: string, password: string, ps: RemitPrivateState): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, encryptPrivateState(ps, password));
}
