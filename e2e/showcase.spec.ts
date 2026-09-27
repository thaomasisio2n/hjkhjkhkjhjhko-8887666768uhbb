import { expect, test } from "@playwright/test";
import { loginAsDemo, uniqueEmail } from "./helpers";

test("the shared demo account can look at settings but not lock anyone out", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/settings");
  await expect(page.getByText("You're on the shared demo account")).toBeVisible();
  await expect(page.getByLabel("Username")).toBeDisabled();
  // Browser-only preferences still work.
  await expect(page.getByRole("switch", { name: "Streamer mode" })).toBeEnabled();

  await page.getByRole("tab", { name: "Security" }).click();
  await expect(page.getByRole("button", { name: "Change password" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Set up 2FA" })).toBeDisabled();
  await expect(page.getByTestId("session-row")).toHaveCount(1);

  await page.getByRole("tab", { name: "Responsible play" }).click();
  await expect(page.getByRole("button", { name: "Start break" })).toBeDisabled();

  await page.getByRole("tab", { name: "Privacy" }).click();
  await expect(page.getByRole("button", { name: "Delete my account" })).toBeDisabled();

  await page.getByRole("button", { name: "Create my own account" }).click();
  await expect(page).toHaveURL(/\/register/);
});

test("sign-up refuses a common password", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Username").fill("Careful Carl");
  await page.getByLabel("Email").fill(uniqueEmail("common"));
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("That password is too common")).toBeVisible();
  await expect(page).toHaveURL(/\/register/);
});
