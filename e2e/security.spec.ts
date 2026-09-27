import { expect, test } from "@playwright/test";
import { totp } from "../apps/api/src/lib/totp";
import { API, signInAsNewUser, signInThroughForm } from "./helpers";

test("two-factor auth: set up, then required at sign-in", async ({ page, request }) => {
  const user = await signInAsNewUser(page, request);
  await page.goto("/settings?tab=security");
  await page.getByRole("button", { name: "Set up 2FA" }).click();

  const secret = (await page.getByTestId("totp-secret").getAttribute("data-secret"))!;
  expect(secret).toMatch(/^[A-Z2-7]{32}$/);
  await page.getByLabel("6-digit code").fill(totp(secret));
  await page.getByRole("button", { name: "Enable 2FA" }).click();
  await expect(page.getByText("Two-factor authentication enabled")).toBeVisible();
  await expect(page.getByText("Enabled", { exact: true })).toBeVisible();

  // Sign out and back in: the form now asks for a code.
  await page.evaluate(() => localStorage.removeItem("demo_token"));
  await signInThroughForm(page, user.email, user.password);
  await expect(page.getByRole("heading", { name: "Two-factor authentication" })).toBeVisible();
  await page.getByLabel("Code").fill("000000" === totp(secret) ? "111111" : "000000");
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByText("That code didn't work")).toBeVisible();
  await page.getByLabel("Code").fill(totp(secret));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page).toHaveURL(/\/lobby/);
});

test("sessions: sign out other devices", async ({ page, request }) => {
  const user = await signInAsNewUser(page, request);
  const other = await request.post(`${API}/auth/login`, { data: { email: user.email, password: user.password } });
  const otherToken = (await other.json()).token;

  await page.goto("/settings?tab=security");
  await expect(page.getByTestId("session-row")).toHaveCount(2);
  await expect(page.getByText("This device", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign out all other devices" }).click();
  await expect(page.getByText("Signed out 1 other device")).toBeVisible();
  await expect(page.getByTestId("session-row")).toHaveCount(1);

  const me = await request.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${otherToken}` } });
  expect(me.status()).toBe(401);
});

test("break in play signs out and blocks sign-in", async ({ page, request }) => {
  const user = await signInAsNewUser(page, request);
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
  const user = await signInAsNewUser(page, request);
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
