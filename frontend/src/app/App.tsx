import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { selectExchange } from "../features/conversation/traceSelection";
import { SupervisorTrace } from "../features/supervisor/SupervisorTrace";
import {
  HttpTurnClient,
  TurnClientError,
  type TurnClient,
} from "../shared/turn-client/client";
import type { TurnResult } from "../shared/turn-client/schema";
import styles from "./App.module.css";

type Exchange = {
  id: number;
  userText: string;
  result?: TurnResult;
  error?: string;
};

type Props = {
  client?: TurnClient;
};

function makeSessionId() {
  return `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function App({ client }: Props) {
  const resolvedClient = useMemo(
    () =>
      client ??
      new HttpTurnClient(import.meta.env.VITE_API_BASE_URL?.trim() || "/api"),
    [client],
  );
  const sessionId = useRef(makeSessionId());
  const nextId = useRef(1);
  const activeRequest = useRef<AbortController | null>(null);

  const [draft, setDraft] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [pending, setPending] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const latestExchange = exchanges.at(-1);
  const selectedExchange = selectExchange(exchanges, selectedId);
  const statusLabel = pending
    ? "Обработка"
    : latestExchange?.error
      ? "Ошибка"
      : latestExchange?.result?.trace.handoff
        ? "Передача оператору"
        : latestExchange?.result
          ? "Ответ получен"
          : "Готов к диалогу";

  useEffect(
    () => () => {
      activeRequest.current?.abort();
      activeRequest.current = null;
    },
    [],
  );

  async function submitText(text: string, retryId?: number) {
    // The ref closes the gap before React has rendered disabled controls.
    if (activeRequest.current || !text || text.length > 4000) return;

    const controller = new AbortController();
    activeRequest.current = controller;
    const id = retryId ?? nextId.current++;
    setPending(true);
    setSelectedId(id);
    setExchanges((current) =>
      retryId === undefined
        ? [...current, { id, userText: text }]
        : current.map((exchange) =>
            exchange.id === id ? { id, userText: text } : exchange,
          ),
    );

    try {
      const result = await resolvedClient.submit(
        {
          session_id: sessionId.current,
          text,
        },
        controller.signal,
      );
      if (activeRequest.current !== controller) return;
      if (controller.signal.aborted) {
        throw new DOMException("Cancelled", "AbortError");
      }
      setExchanges((current) =>
        current.map((exchange) =>
          exchange.id === id ? { ...exchange, result } : exchange,
        ),
      );
    } catch (error) {
      if (activeRequest.current !== controller) return;
      const message = controller.signal.aborted
        ? "Ожидание отменено. Сервер мог продолжить обработку; результат не подтверждён."
        : error instanceof TurnClientError
          ? error.message
          : "Не удалось обработать запрос.";
      setExchanges((current) =>
        current.map((exchange) =>
          exchange.id === id ? { ...exchange, error: message } : exchange,
        ),
      );
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setPending(false);
      }
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || text.length > 4000 || activeRequest.current) return;

    setDraft("");
    void submitText(text);
  }

  return (
    <main className={styles.page}>
      <a className={styles.skipLink} href="#conversation">
        К диалогу
      </a>
      <header className={styles.topbar}>
        <div>
          <span className={styles.kicker}>HACKALEM · VOICE ROUTER</span>
          <h1>Saqta contact center</h1>
        </div>
        <div className={styles.status} aria-live="polite">
          <span className={styles.dot} />
          {statusLabel}
        </div>
      </header>

      <div className={styles.layout}>
        <section
          className={styles.conversation}
          id="conversation"
          aria-label="Conversation"
        >
          <div className={styles.intro}>
            <span>TEXT FALLBACK</span>
            <h2>Напишите запрос как обычный клиент</h2>
            <p>
              Ответ и trace приходят от backend. Frontend не выбирает сценарий
              сам.
            </p>
          </div>

          <div className={styles.history} aria-live="polite">
            {exchanges.length === 0 ? (
              <div className={styles.empty}>
                Например: «Я только что попал в ДТП, что делать?»
              </div>
            ) : (
              exchanges.map((exchange) => (
                <div className={styles.exchange} key={exchange.id}>
                  <div className={styles.userBubble}>{exchange.userText}</div>
                  {exchange.result ? (
                    <div className={styles.assistantBubble}>
                      {exchange.result.assistant_text}
                    </div>
                  ) : exchange.error ? (
                    <div className={styles.errorBubble} role="alert">
                      <span>{exchange.error}</span>
                      <button
                        className={styles.retry}
                        disabled={pending}
                        type="button"
                        onClick={() =>
                          void submitText(exchange.userText, exchange.id)
                        }
                      >
                        Повторить
                      </button>
                    </div>
                  ) : (
                    <div className={styles.waiting}>Маршрутизирую…</div>
                  )}
                  <button
                    className={styles.traceButton}
                    type="button"
                    onClick={() => setSelectedId(exchange.id)}
                    aria-pressed={selectedExchange?.id === exchange.id}
                    aria-label={`Показать trace реплики ${exchange.id}`}
                  >
                    Trace реплики {exchange.id}
                  </button>
                </div>
              ))
            )}
          </div>

          <form className={styles.composer} onSubmit={submit}>
            <div className={styles.voiceStatus}>
              <button
                type="button"
                disabled
                aria-describedby="voice-contract-note"
              >
                Микрофон пока недоступен
              </button>
              <span id="voice-contract-note">
                Ожидаем voice contract от backend.
              </span>
            </div>
            <label htmlFor="customer-text">Сообщение клиента</label>
            <textarea
              id="customer-text"
              name="customerText"
              autoComplete="off"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Введите запрос на русском, казахском или смешанно…"
              rows={3}
              maxLength={4000}
              disabled={pending}
            />
            <div className={styles.composerRow}>
              <span role="status">
                {pending ? "Ожидаем backend…" : `${draft.length}/4000`}
              </span>
              {pending ? (
                <button
                  type="button"
                  onClick={() => activeRequest.current?.abort()}
                >
                  Отменить ожидание
                </button>
              ) : null}
              <button disabled={pending || !draft.trim()} type="submit">
                {pending ? "Отправляем…" : "Отправить"}
              </button>
            </div>
          </form>
        </section>

        <aside className={styles.supervisor} aria-label="Supervisor traces">
          <SupervisorTrace
            result={selectedExchange?.result ?? null}
            error={selectedExchange?.error}
            attempt={selectedExchange?.id}
            pending={Boolean(
              selectedExchange &&
              !selectedExchange.result &&
              !selectedExchange.error,
            )}
          />
        </aside>
      </div>
    </main>
  );
}
