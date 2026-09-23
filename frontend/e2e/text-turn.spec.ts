import { expect, test } from "@playwright/test";

const responsePayload = {
  session_id: "browser-session",
  turn: 1,
  transcript: "Проверить статус полиса",
  assistant_text: "Проверяю статус вашего полиса.",
  trace: {
    language: "unknown",
    scenarios: [
      {
        scenario_id: "SC11",
        confidence: 0.91,
        reason: "Совпали признаки запроса статуса",
      },
      {
        scenario_id: "SC13",
        confidence: 0.62,
        reason: "Есть дополнительный вопрос",
      },
    ],
    alternatives: [{ scenario_id: "SC12", confidence: 0.2 }],
    slots: { policy_number: "P-42" },
    actions: [],
    is_continuation: false,
    needs_clarification: false,
    handoff: false,
    requires_confirmation: true,
    latency_ms: {
      stt: null,
      triage: null,
      router: 123.4,
      response: 0.3,
      tts_first_audio: null,
      total: 124.1,
    },
  },
};

test("sends a text turn and keeps conversation and trace reachable", async ({
  page,
}) => {
  let requestBody: unknown;
  await page.route("**/api/v1/turn/text", async (route) => {
    const body = route.request().postDataJSON() as {
      session_id: string;
      text: string;
    };
    requestBody = body;
    await route.fulfill({
      status: 200,
      json: {
        ...responsePayload,
        session_id: body.session_id,
        transcript: body.text,
      },
    });
  });

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Сообщение клиента").fill("Проверить статус полиса");
  await page.getByRole("button", { name: "Отправить" }).click();

  await expect(page.getByText("Проверяю статус вашего полиса.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Routing trace" }),
  ).toBeVisible();
  await expect(page.getByText("SC11")).toBeVisible();
  await expect(page.getByText("SC13")).toBeVisible();
  await expect(page.getByText("policy_number")).toBeVisible();
  await expect(page.getByText("Действия не выполнялись")).toBeVisible();
  await expect(page.getByText("Действие ещё не выполнено")).toBeVisible();

  expect(requestBody).toMatchObject({
    text: "Проверить статус полиса",
  });
  expect(requestBody).toHaveProperty("session_id");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("renders a backend failure as a failed turn", async ({ page }) => {
  await page.route("**/api/v1/turn/text", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Routing provider is not configured" }),
    }),
  );

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Сообщение клиента").fill("Проверить статус");
  await page.getByRole("button", { name: "Отправить" }).click();

  await expect(
    page.getByRole("alert").getByText("Маршрутизатор пока не настроен."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Повторить" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ошибка запроса" }),
  ).toBeVisible();
  await expect(page.getByText("SC11")).toHaveCount(0);
});
