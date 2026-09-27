import { expect, test } from "@playwright/test";
import { API, loginAsDemo, uniqueEmail } from "./helpers";

test("dashboard shows the seeded friends and a working link", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/referrals");
  await expect(page.locator("#ref-link")).toHaveValue("http://localhost:5174/register?ref=DEMO0001");
  for (const name of ["LuckyLuke", "Marta W.", "Kacper99"]) await expect(page.getByText(name)).toBeVisible();
  await expect(page.getByRole("link", { name: "Share via Telegram" })).toBeVisible();
});

test("a friend signing up pops a live notification for the referrer", async ({ page, request }) => {
  test.setTimeout(60_000);
  await loginAsDemo(page);
  // Let the bell prime itself with the current history first.
  await expect(page.getByRole("button", { name: /^Notifications/ })).toBeVisible();
  await page.waitForTimeout(1_500);

  const res = await request.post(`${API}/auth/register`, {
    data: { email: uniqueEmail("live"), password: "password123", displayName: "LiveViewer", referralCode: "DEMO0001" },
  });
  expect(res.ok()).toBeTruthy();

  // The bell polls every 15s.
  await expect(page.getByText(/LiveViewer joined with your link/)).toBeVisible({ timeout: 25_000 });
});
