import { expect, test } from "@playwright/test";
import { loginAsDemo } from "./helpers";

test("providers list and provider page", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/providers");
  await expect(page.getByRole("heading", { name: "Providers" })).toBeVisible();
  await page.getByRole("link", { name: /Aurora Live/ }).click();
  await expect(page).toHaveURL(/\/providers\/aurora-live/);
  await expect(page.getByRole("heading", { name: "Aurora Live" })).toBeVisible();
  await expect(page.locator("main header").getByText("8 games")).toBeVisible();
  await expect(page.locator("main a[aria-label^='Open ']")).toHaveCount(8);
  await expect(page).toHaveTitle("Aurora Live — NovaSpin");
});

test("game page links to its provider", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/play/zeus-mobile-rush");
  await page.locator("dd").getByRole("link", { name: "Ironclad Games" }).click();
  await expect(page).toHaveURL(/\/providers\/ironclad-games/);
});

test("Help Center: search and signed-out access", async ({ page }) => {
  await page.goto("/help");
  await expect(page.getByRole("heading", { name: "Help Center" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();

  await page.getByLabel("Search help articles").fill("authenticator");
  await expect(page.getByText("How do I turn on two-factor authentication?")).toBeVisible();
  await expect(page.getByText("Are deposits real?")).toBeHidden();

  await page.getByLabel("Search help articles").fill("zzzz");
  await expect(page.getByText("No articles match")).toBeVisible();
});
