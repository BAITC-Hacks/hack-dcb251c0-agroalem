export class TurnClientError extends Error {
  readonly status: number | null;
  readonly code: string;

  constructor(
    message: string,
    status: number | null = null,
    code = "request_failed",
  ) {
    super(message);
    this.name = "TurnClientError";
    this.status = status;
    this.code = code;
  }
}

type Options = {
  signal?: AbortSignal;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

function statusMessage(status: number): string {
  if (status === 422) return "Проверьте текст запроса.";
  if (status === 502) return "Backend не смог построить корректный ответ.";
  if (status === 503) return "Маршрутизатор пока не настроен.";
  if (status === 504) return "Маршрутизатор не ответил вовремя.";
  return "Backend не смог обработать запрос.";
}

/** One attempt only. Cancellation stops waiting, not a server-side action. */
export async function postTurnJson(
  url: string,
  body: unknown,
  { signal, timeoutMs = 60_000, fetchImpl = fetch }: Options = {},
): Promise<unknown> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError("timeoutMs must be finite and positive");
  }
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  const assertActive = () => {
    if (signal?.aborted)
      throw new DOMException("Request cancelled", "AbortError");
    if (timedOut) {
      throw new TurnClientError(
        "Время ожидания истекло. Сервер мог продолжить обработку; ответ не подтверждён.",
        null,
        "timeout",
      );
    }
  };
  assertActive();
  signal?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    assertActive();
    if (!response.ok) {
      // Do not echo arbitrary provider/server details or HTML to the UI.
      throw new TurnClientError(
        statusMessage(response.status),
        response.status,
        "http_error",
      );
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      assertActive();
      throw new TurnClientError(
        "Backend вернул невалидный JSON.",
        null,
        "invalid_json",
      );
    }
    assertActive();
    return data;
  } catch (error) {
    assertActive();
    if (error instanceof TurnClientError) throw error;
    throw new TurnClientError(
      "Не удалось связаться с backend.",
      null,
      "network_error",
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}

export function requireMatchingSession(
  expected: string,
  received: string,
): void {
  if (received !== expected) {
    throw new TurnClientError(
      "Ответ относится к другой сессии и не был применён.",
      null,
      "session_mismatch",
    );
  }
}
