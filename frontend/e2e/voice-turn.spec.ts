import { expect, test } from "@playwright/test";
import { validTurnPayload } from "../src/test/turn-fixture";

test.use({
  launchOptions: {
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  },
  permissions: ["microphone"],
});

test("records browser audio, keeps a session with text, and retries only TTS", async ({
  page,
}) => {
  const sessions: string[] = [];
  let voiceRequests = 0;
  let speechRequests = 0;
  await page.route("**/api/v1/turn/audio", async (route) => {
    voiceRequests++;
    const request = route.request();
    const form = await new Request(request.url(), {
      method: "POST",
      headers: { "Content-Type": request.headers()["content-type"]! },
      body: new Uint8Array(request.postDataBuffer()!),
    }).formData();
    const session = String(form.get("session_id"));
    sessions.push(session);
    const file = form.get("file") as File;
    expect(file.size).toBeGreaterThan(0);
    expect(file.type).toContain("webm");
    expect(form.get("include_audio")).toBe("true");
    await route.fulfill({
      json: {
        ...validTurnPayload,
        session_id: session,
        transcript: "Распознанная голосовая реплика",
        assistant_text: "Ответ на голосовой вопрос",
        assistant_audio: null,
        audio_error: "tts_unavailable",
        trace: {
          ...validTurnPayload.trace,
          latency_ms: {
            ...validTurnPayload.trace.latency_ms,
            stt: 345,
            tts: null,
          },
        },
      },
    });
  });
  await page.route("**/api/v1/audio/speech", async (route) => {
    speechRequests++;
    expect(route.request().postDataJSON()).toEqual({
      text: "Ответ на голосовой вопрос",
    });
    await route.fulfill({ status: 503 });
  });
  await page.route("**/api/v1/turn/text", async (route) => {
    const body = route.request().postDataJSON();
    sessions.push(body.session_id);
    await route.fulfill({
      json: {
        ...validTurnPayload,
        session_id: body.session_id,
        turn: 2,
        transcript: body.text,
        assistant_text: "Текстовый ответ",
      },
    });
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByRole("button", { name: "Начать запись", exact: true }),
  ).toBeEnabled({ timeout: 2500 });
  await page
    .getByRole("button", { name: "Начать запись", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Остановить и отправить", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Сообщение клиента")).toBeDisabled();
  await page
    .getByRole("button", { name: "Остановить и отправить", exact: true })
    .click();
  await expect(
    page.getByText("Ответ на голосовой вопрос", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("article", { name: "Клиент · реплика 1" }),
  ).toContainText("Распознанная голосовая реплика");
  await expect(
    page.getByRole("region", { name: "Supervisor trace", exact: true }),
  ).toContainText("Распознанная голосовая реплика");
  await page
    .getByRole("button", { name: "Повторить озвучку", exact: true })
    .click();
  await expect.poll(() => speechRequests).toBe(1);
  expect(voiceRequests).toBe(1);
  await expect(
    page.getByText("Ответ на голосовой вопрос", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Сообщение клиента").fill("Текст после голоса");
  await page.getByRole("button", { name: "Отправить", exact: true }).click();
  await expect(
    page.getByText("Текстовый ответ", { exact: true }),
  ).toBeVisible();
  expect(sessions).toHaveLength(2);
  expect(sessions[0]).toBe(sessions[1]);
  await page.getByRole("button", { name: "Показать trace реплики 1" }).click();
  await expect(
    page.getByRole("region", { name: "Supervisor trace", exact: true }),
  ).toContainText("Распознанная голосовая реплика");
});

test("denied permission keeps text fallback and never submits audio", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/v1/turn/audio", async (route) => {
    requests++;
    await route.abort();
  });
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Denied", "NotAllowedError");
    };
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Начать запись", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Сообщение клиента")).toBeEnabled();
  expect(requests).toBe(0);
});
