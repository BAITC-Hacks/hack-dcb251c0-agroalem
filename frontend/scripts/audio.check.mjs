/** Transport-only fixture checks, not a substitute for the full frontend build. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire, Module } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "src/shared/turn-client/audio.ts");
const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
const mod = new Module(file);
mod._compile(compiled.outputText, file);
const { AudioApiClient, AudioApiError } = mod.exports;
const realFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = realFetch; });
const audio = () => new Blob(["fixture"], { type: "audio/webm;codecs=opus" });
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });

test("transcription uses backend multipart and no provider key", async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "/api/v1/audio/transcriptions");
    assert.equal(init.body.get("file").name, "recording.webm");
    assert.equal(init.headers, undefined);
    return json({ text: "Тест", latency_ms: 12.3 });
  };
  assert.deepEqual(await new AudioApiClient().transcribe(audio()), { text: "Тест", latency_ms: 12.3 });
});
test("speech returns mp3 blob", async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "/api/v1/audio/speech");
    assert.deepEqual(JSON.parse(init.body), { text: "Тест" });
    return new Response("fixture", { headers: { "Content-Type": "audio/mpeg" } });
  };
  assert.equal((await new AudioApiClient().synthesize(" Тест ")).type, "audio/mpeg");
});
for (const value of [{ text: "", latency_ms: 0 }, { text: "unit", latency_ms: -1 }, { text: "unit" }]) {
  test(`invalid transcription ${JSON.stringify(value)}`, async () => {
    globalThis.fetch = async () => json(value);
    await assert.rejects(new AudioApiClient().transcribe(audio()), (e) => e.code === "invalid_contract");
  });
}
for (const code of [422, 502, 503, 504]) {
  test(`HTTP ${code} stays an error`, async () => {
    globalThis.fetch = async () => json({ detail: "fixture" }, code);
    await assert.rejects(new AudioApiClient().transcribe(audio()), (e) => e instanceof AudioApiError && e.status === code);
  });
}
test("cancelled before fetch makes no network call", async () => {
  globalThis.fetch = async () => { assert.fail("fetch must not run"); };
  const controller = new AbortController(); controller.abort();
  await assert.rejects(new AudioApiClient().transcribe(audio(), controller.signal), (e) => e.code === "cancelled");
});
test("deadline terminates waiting", async () => {
  globalThis.fetch = async (url, init) => new Promise((resolve, reject) => {
    init.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
  });
  await assert.rejects(new AudioApiClient("/api", 5).transcribe(audio()), (e) => e.code === "timeout");
});
test("voice session mismatch is rejected", async () => {
  globalThis.fetch = async () => json({ session_id: "other", turn: 1, transcript: "unit", assistant_text: "unit", trace: {} });
  await assert.rejects(new AudioApiClient().submitVoice("unit", audio()), (e) => e.code === "invalid_contract");
});
test("voice response with TTS failure preserves text", async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "/api/v1/turn/audio");
    assert.equal(init.body.get("session_id"), "unit");
    return json({ session_id: "unit", turn: 1, transcript: "unit", assistant_text: "unit", trace: {}, assistant_audio: null, audio_error: "provider_error" });
  };
  const response = await new AudioApiClient().submitVoice("unit", audio());
  assert.equal(response.assistant_text, "unit");
  assert.equal(response.audio_error, "provider_error");
});
test("bad MIME fails before fetch", async () => {
  globalThis.fetch = async () => assert.fail("fetch must not run");
  await assert.rejects(new AudioApiClient().transcribe(new Blob(["x"], { type: "audio/ogg" })), (e) => e.code === "unsupported_format");
});
test("blank speech is rejected", async () => {
  await assert.rejects(new AudioApiClient().synthesize(" "), (e) => e.code === "invalid_text");
});
test("json is not accepted as speech", async () => {
  globalThis.fetch = async () => json({ error: "unit" });
  await assert.rejects(new AudioApiClient().synthesize("unit"), (e) => e.code === "invalid_contract");
});
