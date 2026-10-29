import { expect, test } from "@playwright/test";
import { loginAsDemo } from "./helpers";

test.beforeEach(async ({ page }) => loginAsDemo(page));

test("search overlay opens with / and navigates to a game", async ({ page }) => {
  await page.keyboard.press("/");
  const dialog = page.getByRole("dialog", { name: "Search" });
  await dialog.getByLabel("Search games").fill("roulette");
  await expect(dialog.getByText("3 results")).toBeVisible();
  await dialog.getByRole("link", { name: "Open Starlight Roulette" }).click();

  await expect(page).toHaveURL(/\/play\/starlight-roulette/);
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Loading Starlight Roulette")).toBeVisible();
  await expect(page.getByText("Game client not connected")).toBeVisible();
  await expect(page).toHaveTitle("Starlight Roulette — NovaSpin");
});

test("favourites can be toggled and listed", async ({ page }) => {
  await page.goto("/play/mega-wheel");
  await expect(page.getByText("Game client not connected")).toBeVisible();
  // The game's own control bar comes before the "More from…" row in the DOM.
  await page.locator("main").getByRole("button", { name: "Add to favourites" }).first().click();
  await expect(page.getByText("Added to favourites")).toBeVisible();

  await page.goto("/lobby?tab=favourites");
  await expect(page.getByRole("link", { name: "Open Mega Wheel" })).toBeVisible();
});

test("category grid filters by provider and sorts", async ({ page }) => {
  await page.goto("/lobby?tab=slots");
  await page.getByLabel("Filter by provider").selectOption("Pixel Forge");
  await page.getByLabel("Sort games").selectOption("za");
  const cards = page.locator("main a[aria-label^='Open ']");
  await expect(cards).toHaveCount(3);
  await expect(cards.first()).toHaveAttribute("aria-label", "Open Wild Frontier Gold");
});

test("unknown routes show the 404 page", async ({ page }) => {
  await page.goto("/definitely-not-here");
  await expect(page.getByRole("heading", { name: "This table doesn't exist" })).toBeVisible();
  await expect(page).toHaveTitle("Page not found — NovaSpin");
});
