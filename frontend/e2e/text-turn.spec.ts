import { expect, test, type Page } from "@playwright/test";

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
    is_continuation: true,
    needs_clarification: true,
    handoff: true,
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

async function submit(page: Page, text = "Проверить статус полиса") {
  await page.getByLabel("Сообщение клиента").fill(text);
  await page.getByRole("button", { name: "Отправить", exact: true }).click();
}

async function interceptSuccess(page: Page) {
  await page.route("**/api/v1/turn/text", async (route) => {
    const body = route.request().postDataJSON() as {
      session_id: string;
      text: string;
    };
    await route.fulfill({
      status: 200,
      json: {
        ...responsePayload,
        session_id: body.session_id,
        transcript: body.text,
      },
    });
  });
}

test("shows an empty dialog and disables blank or whitespace-only submission", async ({
  page,
}, testInfo) => {
  let requests = 0;
  await page.route("**/api/v1/turn/text", async (route) => {
    requests += 1;
    await route.abort();
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await expect(
    page.getByText("Saqta Insurance", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Voice Router", { exact: true })).toBeVisible();
  await expect(page.getByText("Демо", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Начните диалог" }),
  ).toBeVisible();
  const send = page.getByRole("button", { name: "Отправить", exact: true });
  await expect(send).toBeDisabled();
  await page.getByLabel("Сообщение клиента").fill("   \n  ");
  await expect(send).toBeDisabled();
  await page.getByLabel("Сообщение клиента").fill("");
  expect(requests).toBe(0);
  await page.screenshot({ path: testInfo.outputPath("empty.png") });
});

test("renders each scenario's own reason and confidence and exact trace values", async ({
  page,
}, testInfo) => {
  await interceptSuccess(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const request = page.waitForRequest("**/api/v1/turn/text");
  await submit(page);

  expect((await request).postDataJSON()).toMatchObject({
    session_id: expect.any(String),
    text: "Проверить статус полиса",
  });
  await expect(page.getByText(responsePayload.assistant_text)).toBeVisible();
  const trace = page.getByRole("region", {
    name: "Supervisor trace",
    exact: true,
  });
  await expect(
    trace.getByRole("heading", { name: "Supervisor trace · реплика 1" }),
  ).toBeVisible();
  await expect(
    trace.getByText("Проверить статус полиса", { exact: true }),
  ).toBeVisible();
  await expect(trace.getByText("unknown", { exact: true })).toBeVisible();

  for (const [id, percent, reason] of [
    ["SC11", /91\s*%/, "Совпали признаки запроса статуса"],
    ["SC13", /62\s*%/, "Есть дополнительный вопрос"],
  ] as const) {
    const scenario = trace.getByRole("article", { name: `Сценарий ${id}` });
    await expect(scenario.getByText(id, { exact: true })).toBeVisible();
    await expect(scenario.getByText(percent)).toBeVisible();
    await expect(scenario.getByText(reason, { exact: true })).toBeVisible();
  }
  const flags = trace.getByLabel("Состояния реплики");
  for (const [label, value] of [
    ["Уточнение", "Требуется уточнение"],
    ["Передача оператору", "Требуется оператор"],
    ["Подтверждение", "Требуется подтверждение"],
    ["Продолжение диалога", "Да"],
  ] as const) {
    await expect(
      flags.getByText(label, { exact: true }).locator("..").locator("dd"),
    ).toHaveText(value);
  }
  await expect(trace.getByText("policy_number")).toBeVisible();
  await expect(trace.getByText("P-42")).toBeVisible();
  await expect(trace.getByText(/SC12\s+20\s*%/)).toBeVisible();
  await expect(trace.getByText("Действия не выполнялись")).toBeVisible();
  await expect(trace.getByText("Действие ещё не выполнено")).toBeVisible();
  const timing = trace.getByLabel("Длительность этапов");
  await expect(timing.getByText("—", { exact: true })).toHaveCount(3);
  await expect(timing.getByText(/123,4\s*(ms|мс)/)).toBeVisible();
  await expect(timing.getByText(/124,1\s*(ms|мс)/)).toBeVisible();
  await expect(page.getByText("[из API]", { exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("success.png") });
});

test("keeps pending and failed turns free of stale trace and retries the same turn", async ({
  page,
}, testInfo) => {
  let attempts = 0;
  let releaseFailure: (() => void) | undefined;
  const holdFailure = new Promise<void>((resolve) => {
    releaseFailure = resolve;
  });
  await page.route("**/api/v1/turn/text", async (route) => {
    attempts += 1;
    if (attempts === 2) {
      await holdFailure;
      await route.fulfill({
        status: 503,
        json: { detail: "Routing provider is not configured" },
      });
      return;
    }
    const body = route.request().postDataJSON() as {
      session_id: string;
      text: string;
    };
    await route.fulfill({
      status: 200,
      json: {
        ...responsePayload,
        session_id: body.session_id,
        transcript: body.text,
        turn: attempts === 1 ? 1 : 2,
      },
    });
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await submit(page);
  const trace = page.getByRole("region", {
    name: "Supervisor trace",
    exact: true,
  });
  await expect(trace.getByText("SC11", { exact: true })).toBeVisible();
  await submit(page, "Второй запрос");

  await expect(
    page.getByRole("button", { name: "Отправляем…" }),
  ).toBeDisabled();
  await expect(trace.getByText("Ожидаем данные маршрутизации")).toBeVisible();
  await expect(trace.getByText("SC11", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("pending.png") });
  releaseFailure?.();

  await expect(
    page.getByRole("alert").getByText("Маршрутизатор пока не настроен."),
  ).toBeVisible();
  await expect(trace.getByText("Trace этой реплики недоступен")).toBeVisible();
  await expect(trace.getByText("SC11", { exact: true })).toHaveCount(0);
  await expect(
    page.getByText("Routing provider is not configured", { exact: true }),
  ).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("error.png") });

  await page.getByRole("button", { name: "Попробовать снова" }).click();
  await expect(
    trace.getByRole("heading", { name: "Supervisor trace · реплика 2" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Conversation", exact: true })
      .getByText("Второй запрос", { exact: true }),
  ).toHaveCount(1);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: "Показать trace реплики 1" }).click();
  await expect(
    trace.getByText("Проверить статус полиса", { exact: true }),
  ).toBeVisible();
});

test("keeps the newest response in view after history overflows", async ({
  page,
}, testInfo) => {
  let turn = 0;
  await page.route("**/api/v1/turn/text", async (route) => {
    turn += 1;
    const body = route.request().postDataJSON() as {
      session_id: string;
      text: string;
    };
    await route.fulfill({
      status: 200,
      json: {
        ...responsePayload,
        session_id: body.session_id,
        transcript: body.text,
        turn,
        assistant_text: `Ответ ${turn}: ${"Подробности обращения доступны в истории разговора. ".repeat(18)}Конец ответа ${turn}.`,
      },
    });
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  for (let index = 1; index <= 3; index += 1) {
    await submit(page, `Вопрос ${index}`);
    await expect(page.getByText(new RegExp(`^Ответ ${index}:`))).toBeVisible();
  }
  const latestReply = page.getByText(/^Ответ 3:/);
  const scrollSurface =
    testInfo.project.name === "narrow-chromium"
      ? page.getByTestId("conversation-scroll")
      : page.getByRole("region", { name: "Conversation", exact: true });
  await expect
    .poll(
      async () => {
        const replyBox = await latestReply.boundingBox();
        const surfaceBox = await scrollSurface.boundingBox();
        if (!replyBox || !surfaceBox) return false;
        const replyBottom = replyBox.y + replyBox.height;
        return (
          replyBottom <= surfaceBox.y + surfaceBox.height + 1 &&
          replyBottom > surfaceBox.y
        );
      },
      {
        message:
          "The end of the newest assistant reply remains visible after history grows.",
      },
    )
    .toBe(true);
});

test("returns a reselected historical trace to its heading and transcript", async ({
  page,
}) => {
  let turn = 0;
  await page.route("**/api/v1/turn/text", async (route) => {
    turn += 1;
    const body = route.request().postDataJSON() as {
      session_id: string;
      text: string;
    };
    await route.fulfill({
      status: 200,
      json: {
        ...responsePayload,
        session_id: body.session_id,
        transcript: body.text,
        turn,
      },
    });
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  for (let index = 1; index <= 2; index += 1) {
    await submit(page, `Вопрос ${index}`);
    await expect(
      page.getByRole("heading", {
        name: `Supervisor trace · реплика ${index}`,
      }),
    ).toBeVisible();
  }

  const trace = page.getByRole("region", {
    name: "Supervisor trace",
    exact: true,
  });
  await trace
    .getByLabel("Длительность этапов")
    .getByText("Total", { exact: true })
    .scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Показать trace реплики 1" }).click();
  await expect(
    trace.getByRole("heading", { name: "Supervisor trace · реплика 1" }),
  ).toBeInViewport({ ratio: 1 });
  await expect(trace.getByText("Вопрос 1", { exact: true })).toBeInViewport({
    ratio: 1,
  });
});

test("mobile trace scrolls fully above the pinned composer at 360px, 320px and large text", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "narrow-chromium",
    "Mobile geometry is checked once across narrow viewport sizes.",
  );
  await interceptSuccess(page);

  for (const { width, textScale } of [
    { width: 360, textScale: 100 },
    { width: 320, textScale: 100 },
    { width: 320, textScale: 200 },
  ]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.evaluate((scale) => {
      document.documentElement.style.fontSize = `${scale}%`;
    }, textScale);
    await submit(
      page,
      "Нужны статус полиса и дополнительная информация. Маған сақтандыру туралы толық ақпарат қажет.",
    );
    const trace = page.getByRole("region", {
      name: "Supervisor trace",
      exact: true,
    });
    await expect(trace.getByText("SC11", { exact: true })).toBeVisible();
    const scrollArea = page.getByTestId("conversation-scroll");
    await scrollArea.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    const total = trace
      .getByLabel("Длительность этапов")
      .getByText("Total", { exact: true })
      .locator("..");
    const composer = page.getByRole("form", { name: "Отправка сообщения" });
    const totalBox = await total.boundingBox();
    const composerBox = await composer.boundingBox();
    await page.screenshot({
      path: testInfo.outputPath(`mobile-${width}-${textScale}-trace-end.png`),
    });
    await testInfo.attach(`geometry-${width}-${textScale}`, {
      body: JSON.stringify({
        total: totalBox,
        composer: composerBox,
        scroll: await scrollArea.evaluate((element) => ({
          scrollTop: element.scrollTop,
          scrollHeight: element.scrollHeight,
          clientHeight: element.clientHeight,
          rect: element.getBoundingClientRect().toJSON(),
        })),
      }),
      contentType: "application/json",
    });
    await expect(total).toBeInViewport({ ratio: 1 });
    expect(totalBox).not.toBeNull();
    expect(composerBox).not.toBeNull();
    expect(totalBox!.y + totalBox!.height).toBeLessThanOrEqual(
      composerBox!.y + 1,
    );
    expect(composerBox!.y + composerBox!.height).toBeLessThanOrEqual(801);
    await expect(
      page.getByRole("button", { name: "Отправить", exact: true }),
    ).toBeInViewport({ ratio: 1 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});
