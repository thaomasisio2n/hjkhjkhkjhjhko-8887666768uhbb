import { expect, test } from "@playwright/test";
import { DEMO, E2E_PASSWORD, loginAsDemo, uniqueEmail } from "./helpers";

test("demo account signs in to the lobby", async ({ page }) => {
  await loginAsDemo(page);
  await expect(page).toHaveTitle("Casino — NovaSpin");
  await expect(page.getByRole("heading", { name: "Slots" })).toBeVisible();
  await expect(page.locator("header")).toContainText("$");
});

test("wrong password shows an error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO.email);
  await page.getByLabel("Password", { exact: true }).fill("not-the-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Invalid credentials")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("referral link: banner, code validation, and sign-up", async ({ page }) => {
  await page.goto("/register?ref=DEMO0001");
  await expect(page.getByText("Demo Player invited you.")).toBeVisible();

  const code = page.getByLabel("Referral code");
  await code.fill("nope999");
  await expect(page.getByText("This code doesn't exist")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create account" })).toBeDisabled();

  await code.fill("demo0001");
  await expect(code).toHaveValue("DEMO0001");
  await expect(page.getByText("Invited by Demo Player")).toBeVisible();

  await page.getByLabel("Username").fill("Referred Viewer");
  await page.getByLabel("Email").fill(uniqueEmail("ref"));
  await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/lobby/);
  await expect(page.locator("header")).toContainText("$10,000.00");
});
