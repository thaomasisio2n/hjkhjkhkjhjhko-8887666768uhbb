import { expect, test } from "@playwright/test";
import { loginAsDemo } from "./helpers";

test.use({ locale: "pl-PL" });

test("Polish is picked from the browser and can be switched", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Zaloguj się" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "pl");

  await page.getByRole("button", { name: /Kontynuuj z kontem demo/ }).click();
  await expect(page).toHaveURL(/\/lobby/);
  await expect(page.getByRole("button", { name: "Sloty" }).first()).toBeVisible();
  await expect(page).toHaveTitle("Kasyno — NovaSpin");

  await page.goto("/settings");
  await page.getByRole("radiogroup", { name: "Język" }).last().getByRole("radio", { name: "en" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
});
