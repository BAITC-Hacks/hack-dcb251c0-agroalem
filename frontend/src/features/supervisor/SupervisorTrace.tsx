import type { TurnResult } from "../../shared/turn-client/schema";
import styles from "./SupervisorTrace.module.css";

type Props = {
  result: TurnResult | null;
  pending?: boolean;
  error?: string;
  attempt?: number;
};

const latencyLabels: Record<keyof TurnResult["trace"]["latency_ms"], string> = {
  stt: "STT",
  triage: "Triage",
  router: "Router",
  response: "Response",
  tts_first_audio: "TTS first audio",
  total: "Total",
};

const percentFormatter = new Intl.NumberFormat("ru-RU", {
  style: "percent",
  maximumFractionDigits: 0,
});

function ms(value: number | null) {
  return value === null ? "—" : `${value.toLocaleString("ru-RU")} ms`;
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "boolean") return value ? "да" : "нет";
  return JSON.stringify(value);
}

export function SupervisorTrace({
  result,
  pending = false,
  error,
  attempt,
}: Props) {
  if (!result) {
    return (
      <section className={styles.panel} aria-label="Supervisor trace">
        <div className={styles.eyebrow}>
          SUPERVISOR{attempt ? ` · РЕПЛИКА ${attempt}` : ""}
        </div>
        <h2>
          {error
            ? "Ошибка запроса"
            : pending
              ? "Ожидаем trace этой реплики"
              : "Trace появится после первого ответа"}
        </h2>
        {error ? (
          <p className={styles.muted}>
            <span>Trace этой реплики недоступен</span>
            <br />
            {error}
          </p>
        ) : (
          <p className={styles.muted}>
            {pending
              ? "Предыдущий trace не используется вместо нового ответа."
              : "Здесь отображаются только реальные данные backend. Пустые поля не заменяются выдуманными значениями."}
          </p>
        )}
      </section>
    );
  }

  const { trace } = result;
  const slots = Object.entries(trace.slots);

  return (
    <section className={styles.panel} aria-label="Supervisor trace">
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>TURN {result.turn}</div>
          <h2>Routing trace</h2>
        </div>
        <span className={styles.language}>{trace.language}</span>
      </div>

      <div className={styles.block}>
        <span className={styles.label}>Transcript</span>
        <p>{result.transcript}</p>
      </div>

      <div className={styles.block}>
        <span className={styles.label}>Selected scenarios</span>
        {trace.scenarios.length === 0 ? (
          <p className={styles.muted}>—</p>
        ) : (
          <div className={styles.list}>
            {trace.scenarios.map((scenario, index) => (
              <article
                className={styles.scenario}
                key={`${scenario.scenario_id}-${index}`}
              >
                <div className={styles.scenarioTop}>
                  <strong translate="no">{scenario.scenario_id}</strong>
                  <span>{percentFormatter.format(scenario.confidence)}</span>
                </div>
                <p>{scenario.reason}</p>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className={styles.flags} aria-label="Состояния реплики">
        <span>Уточнение: {trace.needs_clarification ? "да" : "нет"}</span>
        <span>Оператор: {trace.handoff ? "да" : "нет"}</span>
        <span>Продолжение: {trace.is_continuation ? "да" : "нет"}</span>
        <span>
          Подтверждение:{" "}
          {trace.requires_confirmation ? "требуется" : "не требуется"}
        </span>
      </div>

      {trace.requires_confirmation ? (
        <div className={styles.confirmation}>
          <strong>Требуется подтверждение</strong>
          <span>Действие ещё не выполнено</span>
        </div>
      ) : null}

      <div className={styles.block}>
        <span className={styles.label}>Alternatives</span>
        <p className={styles.muted}>
          {trace.alternatives.length
            ? trace.alternatives
                .map(
                  (item) =>
                    `${item.scenario_id} ${percentFormatter.format(item.confidence)}`,
                )
                .join(" · ")
            : "—"}
        </p>
      </div>

      <div className={styles.block}>
        <span className={styles.label}>Slots</span>
        {slots.length ? (
          <dl className={styles.keyValues}>
            {slots.map(([key, value]) => (
              <div key={key}>
                <dt translate="no">{key}</dt>
                <dd>{displayValue(value)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className={styles.muted}>—</p>
        )}
      </div>

      <div className={styles.block}>
        <span className={styles.label}>Actions</span>
        {trace.actions.length ? (
          <ul className={styles.actions}>
            {trace.actions.map((action, index) => (
              <li key={`${action}-${index}`}>{action}</li>
            ))}
          </ul>
        ) : (
          <p className={styles.muted}>Действия не выполнялись</p>
        )}
      </div>

      <div className={styles.block}>
        <span className={styles.label}>Latency</span>
        <div className={styles.latencyGrid}>
          {Object.entries(trace.latency_ms).map(([key, value]) => (
            <div className={styles.metric} key={key}>
              <span>{latencyLabels[key as keyof typeof latencyLabels]}</span>
              <strong>{ms(value)}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
