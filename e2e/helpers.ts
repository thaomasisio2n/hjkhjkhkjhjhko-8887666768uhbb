import { expect, type Page } from "@playwright/test";

export const API = "http://localhost:8788";
export const DEMO = { email: "demo@novaspin.test", password: "demo1234" };

let counter = 0;
export const uniqueEmail = (prefix = "e2e") => `${prefix}-${Date.now()}-${++counter}@test.local`;

export async function loginAsDemo(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: /demo account/i }).click();
  await expect(page).toHaveURL(/\/lobby/);
}

export const E2E_PASSWORD = "spin-e2e-8842";

/**
 * Registers through the web app's /api proxy with the page's own request
 * context, so the httpOnly session cookie lands in the browser like a real
 * sign-up would.
 */
export async function signInAsNewUser(page: Page, displayName = "E2E Player") {
  const email = uniqueEmail();
  const res = await page.request.post("/api/auth/register", { data: { email, password: E2E_PASSWORD, displayName } });
  expect(res.ok()).toBeTruthy();
  return { email, password: E2E_PASSWORD };
}

export async function signInThroughForm(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

/** Parses the top-bar balance, e.g. "$50,000.00" → 5000000 cents. */
export async function topbarBalanceCents(page: Page) {
  const text = await page.locator("header").getByRole("button").filter({ hasText: "$" }).first().innerText();
  return Math.round(Number(text.replace(/[^0-9.]/g, "")) * 100);
}
