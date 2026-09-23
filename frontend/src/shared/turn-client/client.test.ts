import { describe, expect, it, vi } from "vitest";

import { validTurnPayload } from "../../test/turn-fixture";
import { HttpTurnClient } from "./client";

type FetchImpl = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe("HttpTurnClient", () => {
  it("posts the exact text request and validates the response", async () => {
    const fetchImpl = vi
      .fn<FetchImpl>()
      .mockResolvedValue(jsonResponse(200, validTurnPayload));
    const client = new HttpTurnClient("/api/", fetchImpl);

    const result = await client.submit({
      session_id: "session-1",
      text: "Статус заявки",
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe("/api/v1/turn/text");
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: "session-1",
        text: "Статус заявки",
      }),
    });
    expect(fetchImpl.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(result.trace.language).toBe("unknown");
    expect(result.trace.latency_ms.stt).toBeNull();
  });

  it.each([
    [422, "Проверьте текст запроса."],
    [502, "Backend не смог построить корректный ответ."],
    [503, "Маршрутизатор пока не настроен."],
    [504, "Маршрутизатор не ответил вовремя."],
  ])("maps HTTP %s to a failed-turn message", async (status, message) => {
    const fetchImpl = vi
      .fn<FetchImpl>()
      .mockResolvedValue(
        jsonResponse(status, { detail: [{ msg: "invalid" }] }),
      );
    const client = new HttpTurnClient("/api", fetchImpl);

    await expect(
      client.submit({ session_id: "session-1", text: "Запрос" }),
    ).rejects.toMatchObject({ status, message });
  });

  it("does not expose a raw backend/provider detail string", async () => {
    const fetchImpl = vi
      .fn<FetchImpl>()
      .mockResolvedValue(jsonResponse(502, { detail: "Provider failed" }));
    const client = new HttpTurnClient("/api", fetchImpl);

    await expect(
      client.submit({ session_id: "session-1", text: "Запрос" }),
    ).rejects.toMatchObject({
      status: 502,
      message: "Backend не смог построить корректный ответ.",
    });
  });

  it("rejects an invalid success payload", async () => {
    const fetchImpl = vi
      .fn<FetchImpl>()
      .mockResolvedValue(jsonResponse(200, { session_id: "session-1" }));
    const client = new HttpTurnClient("/api", fetchImpl);

    await expect(
      client.submit({ session_id: "session-1", text: "Запрос" }),
    ).rejects.toMatchObject({
      status: null,
      message: "Backend вернул ответ неизвестного формата.",
    });
  });

  it("does not replace a network failure with fixture data", async () => {
    const fetchImpl = vi
      .fn<FetchImpl>()
      .mockRejectedValue(new TypeError("offline"));
    const client = new HttpTurnClient("/api", fetchImpl);

    await expect(
      client.submit({ session_id: "session-1", text: "Запрос" }),
    ).rejects.toMatchObject({
      status: null,
      message: "Не удалось связаться с backend.",
    });
  });
});
