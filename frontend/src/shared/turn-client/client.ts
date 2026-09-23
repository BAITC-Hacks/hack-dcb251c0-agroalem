import { turnResultSchema, type TurnInput, type TurnResult } from "./schema";

export interface TurnClient {
  submit(input: TurnInput, signal?: AbortSignal): Promise<TurnResult>;
}

export class TurnClientError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "TurnClientError";
    this.status = status;
  }
}

export class HttpTurnClient implements TurnClient {
  constructor(private readonly baseUrl: string = "/api") {}

  async submit(input: TurnInput, signal?: AbortSignal): Promise<TurnResult> {
    let response: Response;
    try {
      response = await fetch(
        `${this.baseUrl.replace(/\/$/, "")}/v1/turn/text`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          signal,
        },
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      throw new TurnClientError("Не удалось связаться с backend.");
    }

    if (!response.ok) {
      let detail = "";
      try {
        const body = (await response.json()) as { detail?: unknown };
        detail = typeof body.detail === "string" ? body.detail : "";
      } catch {
        // Keep the stable UI-facing fallback below.
      }

      const fallback =
        response.status === 422
          ? "Проверьте текст запроса."
          : response.status === 503
            ? "Маршрутизатор пока не настроен."
            : response.status === 504
              ? "Маршрутизатор не ответил вовремя."
              : "Backend не смог обработать запрос.";

      throw new TurnClientError(detail || fallback, response.status);
    }

    const json: unknown = await response.json();
    const parsed = turnResultSchema.safeParse(json);
    if (!parsed.success) {
      throw new TurnClientError("Backend вернул ответ неизвестного формата.");
    }

    return parsed.data;
  }
}
