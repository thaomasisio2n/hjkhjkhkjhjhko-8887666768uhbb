import { expect, test } from "@playwright/test";
import { totp } from "../apps/api/src/lib/totp";
import { API, signInAsNewUser, signInThroughForm } from "./helpers";

test("two-factor auth: set up, then required at sign-in", async ({ page, request }) => {
  const user = await signInAsNewUser(page);
  await page.goto("/settings?tab=security");
  await page.getByRole("button", { name: "Set up 2FA" }).click();

  const secret = (await page.getByTestId("totp-secret").getAttribute("data-secret"))!;
  expect(secret).toMatch(/^[A-Z2-7]{32}$/);
  await page.getByLabel("6-digit code").fill(totp(secret));
  await page.getByRole("button", { name: "Enable 2FA" }).click();
  await expect(page.getByText("Two-factor authentication enabled")).toBeVisible();
  await expect(page.getByText("Enabled", { exact: true })).toBeVisible();

  // Sign out and back in: the form now asks for a code.
  await page.context().clearCookies();
  await signInThroughForm(page, user.email, user.password);
  await expect(page.getByRole("heading", { name: "Two-factor authentication" })).toBeVisible();
  await page.getByLabel("Code").fill("000000" === totp(secret) ? "111111" : "000000");
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByText("That code didn't work")).toBeVisible();
  // Each code works once; the one that enabled 2FA is spent, so use the next one
  // (still inside the allowed clock drift).
  await page.getByLabel("Code").fill(totp(secret, Date.now() + 30_000));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page).toHaveURL(/\/lobby/);
});

test("sessions: sign out other devices", async ({ page, request }) => {
  const user = await signInAsNewUser(page);
  // "Another device": the request fixture has its own cookie jar.
  expect((await request.post(`${API}/auth/login`, { data: { email: user.email, password: user.password } })).ok()).toBeTruthy();

  await page.goto("/settings?tab=security");
  await expect(page.getByTestId("session-row")).toHaveCount(2);
  await expect(page.getByText("This device", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign out all other devices" }).click();
  await expect(page.getByText("Signed out 1 other device")).toBeVisible();
  await expect(page.getByTestId("session-row")).toHaveCount(1);

  expect((await request.get(`${API}/auth/me`)).status()).toBe(401);
});

test("break in play signs out and blocks sign-in", async ({ page, request }) => {
  const user = await signInAsNewUser(page);
  await page.goto("/settings?tab=responsible");
  await page.getByRole("radio", { name: "1 hour" }).click();
  await page.getByRole("button", { name: "Start break" }).click();
  await page.getByRole("button", { name: "Yes, start my break" }).click();

  await expect(page).toHaveURL(/\/login\?break=/);
  await expect(page.getByText(/You're taking a break until/)).toBeVisible();

  await signInThroughForm(page, user.email, user.password);
  await expect(page.getByText(/You're taking a break until/)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("account deletion needs the password", async ({ page, request }) => {
  const user = await signInAsNewUser(page);
  await page.goto("/settings?tab=privacy");
  await page.getByRole("button", { name: "Delete my account" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete your account?" });
  await dialog.getByPlaceholder("Password").fill("wrong-password");
  await dialog.getByRole("button", { name: "Delete permanently" }).click();
  await expect(dialog.getByText("Current password is incorrect")).toBeVisible();

  await dialog.getByPlaceholder("Password").fill(user.password);
  await dialog.getByRole("button", { name: "Delete permanently" }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText("Your account was deleted")).toBeVisible();

  const login = await request.post(`${API}/auth/login`, { data: { email: user.email, password: user.password } });
  expect(login.status()).toBe(401);
});
