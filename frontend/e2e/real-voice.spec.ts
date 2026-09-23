import { expect, test } from "@playwright/test";

test("live synthetic speech passes browser recording, STT, routing, TTS and playback", async ({
  page,
  request,
}) => {
  test.skip(
    process.env.REAL_VOICE !== "1",
    "Paid live OpenAI check; synthetic speech, not a human microphone acceptance test.",
  );
  test.setTimeout(240_000);
  // Generate synthetic, non-personal speech on the real backend. No route interception.
  const input = await request.post("/api/v1/audio/speech", {
    data: { text: "Здравствуйте! Я попал в аварию. Что мне делать?" },
    timeout: 60_000,
  });
  expect(input.status()).toBe(200);
  const encoded = (await input.body()).toString("base64");
  await page.addInitScript((base64) => {
    // Real MediaRecorder receives a WebAudio stream; only physical microphone input is replaced.
    navigator.mediaDevices.getUserMedia = async () => {
      const context = new AudioContext();
      await context.resume();
      const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      const buffer = await context.decodeAudioData(bytes.buffer);
      const source = context.createBufferSource();
      source.buffer = buffer;
      const destination = context.createMediaStreamDestination();
      source.connect(destination);
      source.onended = () => {
        document.documentElement.dataset.inputSpeechEnded = "true";
      };
      source.start(context.currentTime + 0.1);
      destination.stream.getTracks().forEach((track) => {
        const stop = track.stop.bind(track);
        track.stop = () => {
          stop();
          source.stop();
          void context.close();
        };
      });
      return destination.stream;
    };
  }, encoded);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("button", { name: "Начать запись", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-input-speech-ended",
    "true",
    { timeout: 30_000 },
  );
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/turn/audio") &&
      response.request().method() === "POST",
    { timeout: 180_000 },
  );
  await page
    .getByRole("button", { name: "Остановить и отправить", exact: true })
    .click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.transcript.length).toBeGreaterThan(5);
  expect(body.trace.language).toBe("ru");
  expect(body.trace.latency_ms.stt).toBeGreaterThan(0);
  expect(body.trace.latency_ms.tts).toBeGreaterThan(0);
  expect(body.trace.latency_ms.tts_first_audio).toBeNull();
  expect(body.assistant_audio?.mime_type).toBe("audio/mpeg");
  expect(body.audio_error).toBeNull();
  await expect(
    page.getByRole("region", { name: "Supervisor trace", exact: true }),
  ).toContainText(body.transcript);
  await expect(
    page.getByRole("article", { name: "Ассистент · реплика 1" }),
  ).toContainText(body.assistant_text);
  const audio = page.locator("audio");
  await expect(audio).toHaveCount(1);
  await audio.evaluate((element: HTMLAudioElement) => element.play());
  await expect
    .poll(
      () => audio.evaluate((element: HTMLAudioElement) => element.currentTime),
      { timeout: 15_000 },
    )
    .toBeGreaterThan(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
  console.log(
    JSON.stringify({
      evidence: "live synthetic RU audio",
      backendTurn: body.turn,
      language: body.trace.language,
      scenarios: body.trace.scenarios.map(
        (item: { scenario_id: string }) => item.scenario_id,
      ),
      latency_ms: body.trace.latency_ms,
    }),
  );
});
