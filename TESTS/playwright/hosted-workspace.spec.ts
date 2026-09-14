import { test, expect } from "@playwright/test";

/**
 * Read-only hosted UI. Never connects a wallet or submits Preprod txs.
 */
test("hosted workspace maps the K-set fill without fiction or overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?v=playwright-f1d64ec", { waitUntil: "domcontentloaded" });
  const landing = await page.locator("body").innerText();
  expect(landing).not.toMatch(/\$2\.4B|USDC\.n|Corvus|MD-2901|31,918/);

  await page.getByRole("button", { name: "Open workspace" }).first().click();
  await expect(page.getByText("ON-CHAIN FILLS")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText(/12306cbe/i)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText(/308c7b2c/i)).toBeVisible();

  const body = await page.locator("body").innerText();
  expect(body).not.toMatch(/No executions yet/);
  expect(body).not.toMatch(/\$2\.4B|USDC\.n|Corvus|MD-2901/);

  const overflowX = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflowX).toBe(0);
});
