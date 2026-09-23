import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { SupervisorTrace } from "../features/supervisor/SupervisorTrace";
import { selectExchange } from "../features/conversation/traceSelection";
import { HttpTurnClient, TurnClientError, type TurnClient } from "../shared/turn-client/client";
import type { TurnResult } from "../shared/turn-client/schema";
import styles from "./App.module.css";

type Exchange = { id: number; userText: string; result?: TurnResult; error?: string };
type Props = { client?: TurnClient };

function makeSessionId() {
  return `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function App({ client }: Props) {
  const resolvedClient = useMemo(
    () => client ?? new HttpTurnClient(import.meta.env.VITE_API_BASE_URL?.trim() || "/api"),
    [client],
  );
  const sessionId = useRef(makeSessionId());
  const nextId = useRef(1);
  const activeRequest = useRef<AbortController | null>(null);
  const [draft, setDraft] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [pending, setPending] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = selectExchange(exchanges, selectedId);

  useEffect(() => () => {
    activeRequest.current?.abort();
    activeRequest.current = null;
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    // Ref guards against repeated events before React has rendered disabled controls.
    if (!text || text.length > 4000 || activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    const id = nextId.current++;
    setDraft("");
    setPending(true);
    setSelectedId(id);
    setExchanges((current) => [...current, { id, userText: text }]);
    try {
      const result = await resolvedClient.submit(
        { session_id: sessionId.current, text }, controller.signal,
      );
      if (activeRequest.current !== controller) return;
      if (controller.signal.aborted) throw new DOMException("Cancelled", "AbortError");
      setExchanges((current) => current.map((item) => item.id === id ? { ...item, result } : item));
    } catch (error) {
      if (activeRequest.current !== controller) return;
      const message = controller.signal.aborted
        ? "Ожидание отменено. Сервер мог продолжить обработку; результат не подтверждён."
        : error instanceof TurnClientError ? error.message : "Не удалось обработать запрос.";
      setExchanges((current) => current.map((item) => item.id === id ? { ...item, error: message } : item));
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setPending(false);
      }
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div><span className={styles.kicker}>HACKALEM · VOICE ROUTER</span><h1>Saqta contact center</h1></div>
        <div className={styles.status}>Текстовый режим</div>
      </header>
      <div className={styles.layout}>
        <section className={styles.conversation} aria-label="Conversation">
          <div className={styles.intro}>
            <span>TEXT FALLBACK</span><h2>Напишите запрос как обычный клиент</h2>
            <p>Ответ и trace приходят от backend. Frontend не выбирает сценарий сам.</p>
          </div>
          <div className={styles.history} aria-live="polite">
            {exchanges.length === 0 ? <div className={styles.empty}>Введите запрос на русском, казахском или смешанно.</div> :
              exchanges.map((exchange) => (
                <div className={styles.exchange} key={exchange.id}>
                  <div className={styles.userBubble}>{exchange.userText}</div>
                  {exchange.result ? <div className={styles.assistantBubble}>{exchange.result.assistant_text}</div> :
                    exchange.error ? <div className={styles.errorBubble} role="alert">{exchange.error}</div> :
                      <div className={styles.waiting}>Маршрутизирую…</div>}
                  <button type="button" onClick={() => setSelectedId(exchange.id)}
                    aria-pressed={selected?.id === exchange.id}
                    aria-label={`Показать trace реплики ${exchange.id}`}>
                    Trace реплики {exchange.id}
                  </button>
                </div>
              ))}
          </div>
          <form className={styles.composer} onSubmit={submit}>
            <label htmlFor="customer-text">Сообщение клиента</label>
            <textarea id="customer-text" value={draft} onChange={(event) => setDraft(event.target.value)}
              placeholder="Введите запрос на русском, казахском или смешанно…" rows={3}
              maxLength={4000} disabled={pending} />
            <div className={styles.composerRow}>
              <span role="status">{pending ? "Ожидаем backend…" : `${draft.length}/4000`}</span>
              {pending && <button type="button" onClick={() => activeRequest.current?.abort()}>Отменить ожидание</button>}
              <button disabled={pending || !draft.trim()} type="submit">{pending ? "Отправляем…" : "Отправить"}</button>
            </div>
          </form>
        </section>
        <SupervisorTrace result={selected?.result ?? null} error={selected?.error} attempt={selected?.id}
          pending={Boolean(selected && !selected.result && !selected.error)} />
      </div>
    </main>
  );
}
