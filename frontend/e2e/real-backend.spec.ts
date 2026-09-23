import { expect, test } from "@playwright/test";

test("runs a real browser-to-backend text turn", async ({ page }) => {
  test.setTimeout(90_000);
  test.skip(
    process.env.REAL_BACKEND !== "1",
    "Set REAL_BACKEND=1 and start Tim's backend to run the live smoke.",
  );

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const response = page.waitForResponse(
    (candidate) =>
      candidate.url().endsWith("/api/v1/turn/text") &&
      candidate.request().method() === "POST",
    { timeout: 65_000 },
  );
  await page
    .getByLabel("Сообщение клиента")
    .fill("Я только что попал в аварию, что делать?");
  await page.getByRole("button", { name: "Отправить" }).click();
  expect((await response).status()).toBe(200);

  await expect(
    page.getByRole("heading", { name: "Supervisor trace · реплика 1" }),
  ).toBeVisible();
  await expect(page.getByText("SC11")).toBeVisible();
  await expect(page.getByText("ru", { exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("renders a real backend missing-provider 503 without fixture fallback", async ({
  page,
}) => {
  test.skip(
    process.env.REAL_BACKEND_FAILURE !== "1",
    "Set REAL_BACKEND_FAILURE=1 and start Tim's backend without provider credentials.",
  );

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const response = page.waitForResponse(
    (candidate) =>
      candidate.url().endsWith("/api/v1/turn/text") &&
      candidate.request().method() === "POST",
  );
  await page.getByLabel("Сообщение клиента").fill("Проверить статус полиса");
  await page.getByRole("button", { name: "Отправить", exact: true }).click();

  expect((await response).status()).toBe(503);
  await expect(
    page.getByRole("alert").getByText("Маршрутизатор пока не настроен."),
  ).toBeVisible();
  const trace = page.getByRole("region", {
    name: "Supervisor trace",
    exact: true,
  });
  await expect(trace.getByText("Trace этой реплики недоступен")).toBeVisible();
  await expect(trace.getByRole("article")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Попробовать снова" }),
  ).toBeVisible();
});
