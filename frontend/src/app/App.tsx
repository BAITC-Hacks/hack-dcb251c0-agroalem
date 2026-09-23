import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { selectExchange } from "../features/conversation/traceSelection";
import { SupervisorTrace } from "../features/supervisor/SupervisorTrace";
import { VoiceRecorder } from "../features/voice/VoiceRecorder";
import { VoicePlayer } from "../features/voice/VoicePlayer";
import { AudioApiClient, AudioApiError } from "../shared/turn-client/audio";
import {
  HttpTurnClient,
  TurnClientError,
  type TurnClient,
} from "../shared/turn-client/client";
import {
  turnResultSchema,
  type TurnResult,
} from "../shared/turn-client/schema";
import styles from "./App.module.css";

type Exchange = {
  id: number;
  userText: string;
  recording?: Blob;
  result?: TurnResult;
  error?: string;
};

type Props = {
  client?: TurnClient;
  audioClient?: Pick<AudioApiClient, "submitVoice" | "synthesize">;
};

function makeSessionId() {
  return `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function App({ client, audioClient }: Props) {
  const resolvedClient = useMemo(
    () =>
      client ??
      new HttpTurnClient(import.meta.env.VITE_API_BASE_URL?.trim() || "/api"),
    [client],
  );
  const sessionId = useRef(makeSessionId());
  const resolvedAudioClient = useMemo(
    () =>
      audioClient ??
      new AudioApiClient(import.meta.env.VITE_API_BASE_URL?.trim() || "/api"),
    [audioClient],
  );
  const recordingBusy = useRef(false);
  const [recording, setRecording] = useState(false);
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

  async function submitTurn(input: string | Blob, retryId?: number) {
    // The ref closes the gap before React has rendered disabled controls.
    if (activeRequest.current) return;
    if (
      typeof input === "string" &&
      (recordingBusy.current || !input || input.length > 4000)
    )
      return;
    const text =
      typeof input === "string"
        ? input
        : "Голосовое сообщение · ожидаем распознавание";
    const entry: Exchange = {
      id: retryId ?? nextId.current++,
      userText: text,
      ...(typeof input === "string" ? {} : { recording: input }),
    };

    const controller = new AbortController();
    activeRequest.current = controller;
    const id = entry.id;
    setLatestRequestId(id);
    followReply.current = true;
    setPending(true);
    setSelectedId(id);
    setExchanges((current) =>
      retryId === undefined
        ? [...current, entry]
        : current.map((exchange) => (exchange.id === id ? entry : exchange)),
    );

    try {
      let result: TurnResult;
      if (typeof input === "string") {
        result = await resolvedClient.submit(
          { session_id: sessionId.current, text },
          controller.signal,
        );
      } else {
        const envelope = await resolvedAudioClient.submitVoice(
          sessionId.current,
          input,
          controller.signal,
        );
        const parsed = turnResultSchema.safeParse(envelope);
        if (!parsed.success || parsed.data.session_id !== sessionId.current) {
          throw new AudioApiError(
            "Голосовой ответ не соответствует сессии или контракту.",
            "invalid_contract",
          );
        }
        result = parsed.data;
      }
      if (activeRequest.current !== controller) return;
      if (controller.signal.aborted) {
        throw new DOMException("Cancelled", "AbortError");
      }
      setExchanges((current) =>
        current.map((exchange) =>
          exchange.id === id
            ? {
                id,
                userText: typeof input === "string" ? text : result.transcript,
                result,
              }
            : exchange,
        ),
      );
    } catch (error) {
      if (activeRequest.current !== controller) return;
      const message = controller.signal.aborted
        ? "Ожидание отменено. Сервер мог продолжить обработку; результат не подтверждён."
        : error instanceof TurnClientError || error instanceof AudioApiError
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
    if (
      !text ||
      text.length > 4000 ||
      activeRequest.current ||
      recordingBusy.current
    )
      return;

    setDraft("");
    void submitTurn(text);
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
                    Нажмите микрофон или введите сообщение, чтобы увидеть ответ
                    и решение маршрутизатора
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
                        <>
                          <div className={styles.assistantBubble}>
                            {exchange.result.assistant_text}
                          </div>
                          <VoicePlayer
                            audio={exchange.result.assistant_audio}
                            audioError={exchange.result.audio_error}
                            text={exchange.result.assistant_text}
                            synthesize={(text, signal) =>
                              resolvedAudioClient.synthesize(text, signal)
                            }
                          />
                        </>
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
                            disabled={pending || recording}
                            type="button"
                            onClick={() =>
                              void submitTurn(
                                exchange.recording ?? exchange.userText,
                                exchange.id,
                              )
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
              disabled={pending || recording}
            />
            <button
              className={styles.sendButton}
              disabled={pending || recording || !draft.trim()}
              type="submit"
            >
              {pending ? "Отправляем…" : "Отправить"}
            </button>
          </div>
          <div className={styles.composerMeta}>
            <VoiceRecorder
              disabled={pending}
              onBusyChange={(busy) => {
                recordingBusy.current = busy;
                setRecording(busy);
              }}
              onRecorded={(blob) => {
                void submitTurn(blob);
              }}
            />
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
