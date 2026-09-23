// Runs real transport/selection source with node:test. No live backend, React or model claims.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
async function loadTypeScript(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    reportDiagnostics: true,
  });
  assert.equal(compiled.diagnostics.filter((d) => d.category === ts.DiagnosticCategory.Error).length, 0);
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString("base64")}`);
}
const { postTurnJson, TurnClientError, requireMatchingSession } = await loadTypeScript("../src/shared/turn-client/transport.ts");
const { selectExchange } = await loadTypeScript("../src/features/conversation/traceSelection.ts");
const payload = { session_id: "unit-session", text: "Сәлем, тестовый запрос" };
const abortingFetch = async (_url, init) => new Promise((_resolve, reject) => {
  init.signal.addEventListener("abort", () => reject(new DOMException("cancelled", "AbortError")), { once: true });
});

test("sends one JSON request without provider credentials", async () => {
  let calls = 0;
  const data = await postTurnJson("/api/v1/turn/text", payload, {
    fetchImpl: async (url, init) => {
      calls++;
      assert.equal(url, "/api/v1/turn/text");
      assert.equal(init.method, "POST");
      assert.deepEqual(JSON.parse(init.body), payload);
      assert.deepEqual(init.headers, { "Content-Type": "application/json" });
      return Response.json({ session_id: "unit-session" });
    },
  });
  assert.deepEqual(data, { session_id: "unit-session" });
  assert.equal(calls, 1);
});

for (const status of [422, 502, 503, 504, 500]) {
  test(`HTTP ${status} remains a failed turn and does not leak body`, async () => {
    await assert.rejects(postTurnJson("/api", payload, {
      fetchImpl: async () => new Response("SECRET-LIKE-TEST-BODY", { status }),
    }), (error) => error instanceof TurnClientError && error.status === status &&
      error.code === "http_error" && !error.message.includes("SECRET-LIKE"));
  });
}

test("invalid JSON gets an explicit contract error", async () => {
  await assert.rejects(postTurnJson("/api", payload, {
    fetchImpl: async () => new Response("not JSON", { status: 200 }),
  }), (error) => error.code === "invalid_json");
});

test("network failure is not retried or replaced with fixture success", async () => {
  let calls = 0;
  await assert.rejects(postTurnJson("/api", payload, { fetchImpl: async () => {
    calls++; throw new TypeError("network failure");
  }}), (error) => error.code === "network_error");
  assert.equal(calls, 1);
});

test("pre-cancelled request makes no network call", async () => {
  const controller = new AbortController(); controller.abort();
  let calls = 0;
  await assert.rejects(postTurnJson("/api", payload, {
    signal: controller.signal, fetchImpl: async () => { calls++; return Response.json({}); },
  }), (error) => error.name === "AbortError");
  assert.equal(calls, 0);
});

test("caller cancellation is forwarded", async () => {
  const controller = new AbortController();
  const request = postTurnJson("/api", payload, { signal: controller.signal, fetchImpl: abortingFetch });
  controller.abort();
  await assert.rejects(request, (error) => error.name === "AbortError");
});

test("deadline returns timeout, not an invented result", async () => {
  await assert.rejects(postTurnJson("/api", payload, {
    timeoutMs: 5, fetchImpl: abortingFetch,
  }), (error) => error.code === "timeout");
});

test("late response cannot bypass an expired deadline", async () => {
  await assert.rejects(postTurnJson("/api", payload, {
    timeoutMs: 5, fetchImpl: async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return Response.json({ late: true });
    },
  }), (error) => error.code === "timeout");
});

for (const timeoutMs of [0, -1, NaN, Infinity]) {
  test(`invalid timeout ${timeoutMs} is rejected`, async () => {
    await assert.rejects(postTurnJson("/api", payload, { timeoutMs }), RangeError);
  });
}

test("same session is accepted", () => requireMatchingSession("a", "a"));
test("another session is rejected", () => assert.throws(() => requireMatchingSession("a", "b"),
  (error) => error.code === "session_mismatch"));

test("empty conversation has no trace", () => assert.equal(selectExchange([], null), null));
test("pending turn cannot borrow previous successful trace", () => {
  const pending = { id: 2 };
  assert.equal(selectExchange([{ id: 1, result: { scenario: "fixture" } }, pending], null), pending);
});
test("failed turn cannot borrow previous successful trace", () => {
  const failed = { id: 2, error: "network" };
  assert.equal(selectExchange([{ id: 1, result: {} }, failed], 2), failed);
});
test("historical trace is available only by explicit selection", () => {
  const first = { id: 1, result: {} };
  assert.equal(selectExchange([first, { id: 2, error: "error" }], 1), first);
});
test("missing selected id does not select another turn", () => assert.equal(selectExchange([{ id: 1 }], 99), null));
