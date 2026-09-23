import { expect, test } from "@playwright/test";

test("runs a real browser-to-backend text turn", async ({ page }) => {
  test.skip(
    process.env.REAL_BACKEND !== "1",
    "Set REAL_BACKEND=1 and start Tim's backend to run the live smoke.",
  );

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page
    .getByLabel("Сообщение клиента")
    .fill("Я только что попал в аварию, что делать?");
  await page.getByRole("button", { name: "Отправить" }).click();

  await expect(
    page.getByRole("heading", { name: "Routing trace" }),
  ).toBeVisible({
    timeout: 120_000,
  });
  await expect(page.getByText("SC11")).toBeVisible();
  await expect(page.getByText("ru", { exact: true })).toBeVisible();
  await expect(page.getByText("Ошибка запроса")).toHaveCount(0);
});
