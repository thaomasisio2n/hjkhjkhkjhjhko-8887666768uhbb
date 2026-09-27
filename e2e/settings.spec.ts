import { expect, test } from "@playwright/test";
import { API, signInAsNewUser } from "./helpers";

test("profile: rename and pick an avatar", async ({ page, request }) => {
  await signInAsNewUser(page, request, "Before Name");
  await page.goto("/settings");
  await page.getByLabel("Username").fill("After Name");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Profile updated")).toBeVisible();

  await page.getByRole("radio", { name: "crown-crimson" }).click();
  await expect(page.getByText("Avatar updated")).toBeVisible();
  await expect(page.getByRole("radio", { name: "crown-crimson" })).toHaveAttribute("aria-checked", "true");

  await page.reload();
  await expect(page.getByLabel("Username")).toHaveValue("After Name");
});

test("password change takes effect", async ({ page, request }) => {
  const user = await signInAsNewUser(page, request);
  await page.goto("/settings");
  await page.getByLabel("Current password").fill(user.password);
  await page.getByLabel("New password", { exact: true }).fill("newpassword456");
  await page.getByLabel("Confirm new password").fill("newpassword456");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Password changed")).toBeVisible();

  const old = await request.post(`${API}/auth/login`, { data: { email: user.email, password: user.password } });
  expect(old.status()).toBe(401);
  const fresh = await request.post(`${API}/auth/login`, { data: { email: user.email, password: "newpassword456" } });
  expect(fresh.ok()).toBeTruthy();
});

test("streamer mode masks the balance", async ({ page, request }) => {
  await signInAsNewUser(page, request);
  await page.goto("/settings");
  await page.getByRole("switch", { name: "Streamer mode" }).click();
  await expect(page.locator("header")).toContainText("$•••••");
  await page.getByRole("switch", { name: "Streamer mode" }).click();
  await expect(page.locator("header")).not.toContainText("$•••••");
});

test("reality check reminds after the chosen interval", async ({ page, request }) => {
  await signInAsNewUser(page, request);
  await page.clock.install();
  await page.goto("/settings");
  await page.getByRole("radio", { name: "15 min" }).click();
  await page.clock.fastForward("15:15");
  await expect(page.getByRole("alertdialog")).toContainText("Reality check");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alertdialog")).toBeHidden();
});
