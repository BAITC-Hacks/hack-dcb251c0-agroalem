import { turnResultSchema, type TurnInput, type TurnResult } from "./schema";
import { postTurnJson, requireMatchingSession, TurnClientError } from "./transport";

export { TurnClientError } from "./transport";

export interface TurnClient {
  submit(input: TurnInput, signal?: AbortSignal): Promise<TurnResult>;
}

export class HttpTurnClient implements TurnClient {
  constructor(
    private readonly baseUrl: string = "/api",
    private readonly timeoutMs = 60_000,
  ) {}

  async submit(input: TurnInput, signal?: AbortSignal): Promise<TurnResult> {
    const json = await postTurnJson(
      `${this.baseUrl.replace(/\/$/, "")}/v1/turn/text`,
      input,
      { signal, timeoutMs: this.timeoutMs },
    );
    const parsed = turnResultSchema.safeParse(json);
    if (!parsed.success) {
      throw new TurnClientError("Backend вернул ответ неизвестного формата.", null, "invalid_contract");
    }
    requireMatchingSession(input.session_id, parsed.data.session_id);
    return parsed.data;
  }
}
