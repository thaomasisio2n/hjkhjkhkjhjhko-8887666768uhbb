import { expect, type Page, type APIRequestContext } from "@playwright/test";

export const API = "http://localhost:8788";
export const DEMO = { email: "demo@novaspin.test", password: "demo1234" };

let counter = 0;
export const uniqueEmail = (prefix = "e2e") => `${prefix}-${Date.now()}-${++counter}@test.local`;

export async function loginAsDemo(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: /demo account/i }).click();
  await expect(page).toHaveURL(/\/lobby/);
}

/** Registers through the API and signs the page in with the returned token. */
export async function signInAsNewUser(page: Page, request: APIRequestContext, displayName = "E2E Player") {
  const email = uniqueEmail();
  const res = await request.post(`${API}/auth/register`, { data: { email, password: "spin-e2e-8842", displayName } });
  expect(res.ok()).toBeTruthy();
  const { token } = await res.json();
  // Set once (not via an init script) so a later logout really signs out.
  await page.goto("/login");
  await page.evaluate((t) => localStorage.setItem("demo_token", t), token);
  return { email, password: "spin-e2e-8842", token };
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
