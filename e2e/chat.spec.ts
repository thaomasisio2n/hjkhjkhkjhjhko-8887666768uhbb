import { expect, test } from "@playwright/test";
import { API, signInAsNewUser, uniqueEmail } from "./helpers";

test("chat: send, switch rooms, and server-side rules", async ({ page, request }) => {
  await signInAsNewUser(page, request, "Chatty");
  await page.goto("/lobby");
  await page.getByRole("button", { name: "Open chat" }).click();
  const chat = page.getByRole("complementary", { name: "Chat" });

  await expect(chat.getByText("Welcome to the NovaSpin demo chat!")).toBeVisible();
  const input = chat.getByPlaceholder("Say something nice…");
  await input.fill("hello from the e2e suite");
  await input.press("Enter");
  await expect(chat.getByTestId("chat-message").last()).toContainText("hello from the e2e suite");
  await expect(chat.getByTestId("chat-message").last()).toContainText("Chatty (you)");

  await input.fill("WHY IS NOBODY ANSWERING");
  await input.press("Enter");
  await expect(page.getByText(/Please don't shout/)).toBeVisible();

  await chat.getByRole("radio", { name: "pl" }).click();
  await expect(chat.getByText("siema! ktoś z Polski?")).toBeVisible();

  await chat.getByRole("button", { name: "Chat rules" }).first().click();
  await expect(page.getByRole("dialog", { name: "Chat rules" })).toContainText("link shorteners are blocked");
});

test("chat: another player's message shows up live", async ({ page, request }) => {
  await signInAsNewUser(page, request);
  await page.goto("/lobby");
  await page.getByRole("button", { name: "Open chat" }).click();
  const chat = page.getByRole("complementary", { name: "Chat" });
  await expect(chat.getByTestId("chat-message").first()).toBeVisible();

  const other = await request.post(`${API}/auth/register`, {
    data: { email: uniqueEmail("chat"), password: "spin-e2e-8842", displayName: "Visitor" },
  });
  const { token } = await other.json();
  await request.post(`${API}/chat/en`, { data: { body: "hi from another tab" }, headers: { Authorization: `Bearer ${token}` } });

  await expect(chat.getByText("hi from another tab")).toBeVisible({ timeout: 10_000 });
});
