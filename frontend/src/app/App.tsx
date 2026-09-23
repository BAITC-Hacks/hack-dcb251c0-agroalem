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
  const traceSurface = useRef<HTMLElement | null>(null);
  const latestReply = useRef<HTMLElement | null>(null);
  const followReply = useRef(false);

  const [draft, setDraft] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [pending, setPending] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [latestRequestId, setLatestRequestId] = useState<number | null>(null);

  const selectedExchange = selectExchange(exchanges, selectedId);

  useEffect(() => {
    // Reveal our submitted reply, not the end of the mobile trace surface.
    // Explicit history navigation disables following until the next submit.
    if (followReply.current && selectedId === latestRequestId) {
      latestReply.current?.scrollIntoView({ block: "end" });
    }
  }, [exchanges, selectedId, latestRequestId]);

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
    setLatestRequestId(id);
    followReply.current = true;
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
        <h1>Saqta Insurance</h1>
        <span className={styles.productName}>Voice Router</span>
        <span className={styles.demoBadge}>Демо</span>
      </header>
      <div className={styles.workspace}>
        <div
          className={styles.layout}
          data-testid="conversation-scroll"
          onWheel={() => {
            followReply.current = false;
          }}
          onPointerDown={() => {
            followReply.current = false;
          }}
          onKeyDown={(event) => {
            if (["ArrowUp", "PageUp", "Home"].includes(event.key)) {
              followReply.current = false;
            }
          }}
        >
          <section
            className={styles.conversation}
            id="conversation"
            aria-label="Conversation"
            tabIndex={-1}
          >
            <div className={styles.history} aria-live="polite">
              {exchanges.length === 0 ? (
                <div className={styles.empty}>
                  <h2>Начните диалог</h2>
                  <p>
                    Введите сообщение клиента, чтобы увидеть ответ и решение
                    маршрутизатора
                  </p>
                </div>
              ) : (
                exchanges.map((exchange) => (
                  <div className={styles.exchange} key={exchange.id}>
                    <article
                      className={styles.messageCard}
                      aria-label={`Клиент · реплика ${exchange.id}`}
                    >
                      <div className={styles.messageHeading}>
                        <span
                          className={styles.customerAvatar}
                          aria-hidden="true"
                        >
                          К
                        </span>
                        <h2>Клиент</h2>
                        <span className={styles.turnNumber}>
                          Реплика {exchange.id}
                        </span>
                      </div>
                      <div className={styles.userBubble}>
                        {exchange.userText}
                      </div>
                    </article>
                    <article
                      className={styles.messageCard}
                      aria-label={`Ассистент · реплика ${exchange.id}`}
                      ref={
                        exchange.id === latestRequestId
                          ? latestReply
                          : undefined
                      }
                    >
                      <div className={styles.messageHeading}>
                        <span
                          className={styles.assistantAvatar}
                          aria-hidden="true"
                        >
                          А
                        </span>
                        <h2>Ассистент</h2>
                      </div>
                      {exchange.result ? (
                        <div className={styles.assistantBubble}>
                          {exchange.result.assistant_text}
                        </div>
                      ) : exchange.error ? (
                        <>
                          <div className={styles.errorBubble} role="alert">
                            <span
                              className={styles.errorIcon}
                              aria-hidden="true"
                            >
                              !
                            </span>
                            <span>{exchange.error}</span>
                          </div>
                          <button
                            className={styles.retry}
                            disabled={pending}
                            type="button"
                            onClick={() =>
                              void submitText(exchange.userText, exchange.id)
                            }
                          >
                            Попробовать снова
                          </button>
                        </>
                      ) : (
                        <div className={styles.waiting}>
                          <span className={styles.spinner} aria-hidden="true" />
                          Обрабатываем сообщение…
                        </div>
                      )}
                      <button
                        className={styles.traceButton}
                        type="button"
                        aria-pressed={selectedExchange?.id === exchange.id}
                        aria-controls="supervisor-trace"
                        aria-label={`Показать trace реплики ${exchange.id}`}
                        onClick={() => {
                          followReply.current = false;
                          setSelectedId(exchange.id);
                          requestAnimationFrame(() => {
                            if (traceSurface.current)
                              traceSurface.current.scrollTop = 0;
                            traceSurface.current?.focus({
                              preventScroll: true,
                            });
                            traceSurface.current?.scrollIntoView({
                              block: "start",
                            });
                          });
                        }}
                      >
                        Trace этой реплики <span aria-hidden="true">→</span>
                      </button>
                    </article>
                  </div>
                ))
              )}
            </div>
          </section>
          <aside
            className={styles.supervisor}
            id="supervisor-trace"
            ref={traceSurface}
            tabIndex={-1}
            aria-label="Supervisor traces"
          >
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
        <form
          className={styles.composer}
          onSubmit={submit}
          aria-label="Отправка сообщения"
        >
          <label className={styles.srOnly} htmlFor="customer-text">
            Сообщение клиента
          </label>
          <div className={styles.composerRow}>
            <textarea
              id="customer-text"
              name="customerText"
              autoComplete="off"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Введите сообщение клиента…"
              rows={2}
              maxLength={4000}
              disabled={pending}
            />
            <button
              className={styles.sendButton}
              disabled={pending || !draft.trim()}
              type="submit"
            >
              {pending ? "Отправляем…" : "Отправить"}
            </button>
          </div>
          <div className={styles.composerMeta}>
            <div className={styles.voiceStatus}>
              <button
                className={styles.micButton}
                type="button"
                disabled
                aria-label="Микрофон пока недоступен"
                aria-describedby="voice-contract-note"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  aria-hidden="true"
                >
                  <rect x="9" y="3" width="6" height="12" rx="3" />
                  <path d="M6 11v1a6 6 0 0 0 12 0v-1M12 18v3M9 21h6" />
                </svg>
              </button>
              <span id="voice-contract-note">
                Голосовой режим пока недоступен.
              </span>
            </div>
            {pending ? (
              <button
                className={styles.cancelButton}
                type="button"
                onClick={() => activeRequest.current?.abort()}
              >
                Отменить ожидание
              </button>
            ) : (
              <span className={styles.counter}>{draft.length}/4000</span>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
