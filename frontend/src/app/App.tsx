import { FormEvent, useMemo, useRef, useState } from "react";
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

  const [draft, setDraft] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [pending, setPending] = useState(false);

  const latestResult =
    [...exchanges].reverse().find((exchange) => exchange.result)?.result ?? null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || pending) return;

    const id = nextId.current++;
    setDraft("");
    setPending(true);
    setExchanges((current) => [...current, { id, userText: text }]);

    try {
      const result = await resolvedClient.submit({
        session_id: sessionId.current,
        text,
      });
      setExchanges((current) =>
        current.map((exchange) =>
          exchange.id === id ? { ...exchange, result } : exchange,
        ),
      );
    } catch (error) {
      const message =
        error instanceof TurnClientError
          ? error.message
          : "Не удалось обработать запрос.";
      setExchanges((current) =>
        current.map((exchange) =>
          exchange.id === id ? { ...exchange, error: message } : exchange,
        ),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div>
          <span className={styles.kicker}>HACKALEM · VOICE ROUTER</span>
          <h1>Saqta contact center</h1>
        </div>
        <div className={styles.status}>
          <span className={styles.dot} />
          text milestone
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.conversation} aria-label="Conversation">
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
                      {exchange.error}
                    </div>
                  ) : (
                    <div className={styles.waiting}>Маршрутизирую…</div>
                  )}
                </div>
              ))
            )}
          </div>

          <form className={styles.composer} onSubmit={submit}>
            <label htmlFor="customer-text">Сообщение клиента</label>
            <textarea
              id="customer-text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Введите запрос на русском, казахском или смешанно…"
              rows={3}
              disabled={pending}
            />
            <div className={styles.composerRow}>
              <span>{pending ? "Ожидаем backend…" : "Готово к отправке"}</span>
              <button disabled={pending || !draft.trim()} type="submit">
                {pending ? "Отправляем…" : "Отправить"}
              </button>
            </div>
          </form>
        </section>

        <SupervisorTrace result={latestResult} />
      </div>
    </main>
  );
}
