import { defineConfig } from "@playwright/test";

/**
 * Read-only hosted UI. Uses the machine Chrome. Never submits Preprod txs.
 * Not part of `npm test`.
 */
export default defineConfig({
  testDir: "./TESTS/playwright",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  use: {
    channel: "chrome",
    baseURL: process.env.REMIT_FRONT_URL ?? "https://remit-front.vercel.app",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [{ name: "chrome" }],
});
