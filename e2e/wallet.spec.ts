import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { loginAsDemo, signInAsNewUser, topbarBalanceCents } from "./helpers";

test("a demo deposit credits the balance", async ({ page }) => {
  await loginAsDemo(page);
  await expect.poll(() => topbarBalanceCents(page)).toBeGreaterThan(0);
  const before = await topbarBalanceCents(page);

  await page.getByRole("button", { name: "Wallet", exact: true }).first().click();
  await page.getByRole("button", { name: "Deposit $100.00" }).click();
  await expect(page.getByText("Balance credited")).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();

  await expect.poll(() => topbarBalanceCents(page)).toBe(before + 10_000);
});

test("daily deposit limit blocks larger deposits", async ({ page, request }) => {
  await signInAsNewUser(page);
  await page.goto("/settings?tab=responsible");
  await page.getByRole("button", { name: "$100", exact: true }).click();
  await expect(page.getByText("Daily deposit limit set to $100.00")).toBeVisible();

  await page.getByRole("button", { name: "Wallet", exact: true }).first().click();
  await page.locator("#deposit-amount").fill("500");
  await expect(page.getByText(/This is over your limit/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Deposit $500.00" })).toBeDisabled();

  await page.locator("#deposit-amount").fill("100");
  await page.getByRole("button", { name: "Deposit $100.00" }).click();
  await expect(page.getByText("Balance credited")).toBeVisible();
});

test("transaction history filters and exports CSV", async ({ page, request }) => {
  await signInAsNewUser(page);
  await page.goto("/wallet");
  await page.getByRole("tab", { name: "Deposits" }).click();
  await expect(page.getByText("Nothing matches this filter.")).toBeVisible();

  await page.getByRole("tab", { name: "Bonuses" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /CSV/ }).click();
  const csv = readFileSync((await (await download).path())!, "utf8");
  expect(csv.split("\r\n")[0]).toBe('"Date","Type","Amount (USD)","Details"');
  expect(csv).toContain("Welcome bonus");
});
