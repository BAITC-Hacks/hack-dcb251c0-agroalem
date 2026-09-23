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
  return value === null ? "—" : `${value.toLocaleString("ru-RU")} мс`;
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (typeof value === "boolean") return value ? "да" : "нет";
  return JSON.stringify(value);
}

export function SupervisorTrace({
  result,
  pending = false,
  error,
  attempt,
}: Props) {
  const turnLabel = attempt ?? result?.turn;
  const title = `Supervisor trace${turnLabel ? ` · реплика ${turnLabel}` : ""}`;

  if (!result) {
    return (
      <section
        className={`${styles.panel} ${styles.emptyPanel}`}
        aria-label="Supervisor trace"
      >
        <h2>{title}</h2>
        <div className={styles.placeholder} aria-live="polite">
          {pending ? (
            <span className={styles.spinner} aria-hidden="true" />
          ) : null}
          <p>
            {error
              ? "Trace этой реплики недоступен"
              : pending
                ? "Ожидаем данные маршрутизации"
                : "Появится после первой обработанной реплики"}
          </p>
        </div>
      </section>
    );
  }

  const { trace } = result;
  const slots = Object.entries(trace.slots);
  return (
    <section className={styles.panel} aria-label="Supervisor trace">
      <h2>{title}</h2>
      <dl className={styles.summary}>
        <div>
          <dt>Transcript</dt>
          <dd>{result.transcript}</dd>
        </div>
        <div>
          <dt>Язык</dt>
          <dd>
            <span className={styles.language}>{trace.language}</span>
          </dd>
        </div>
      </dl>

      <section className={styles.block} aria-label="Выбранные сценарии">
        <h3>Выбранные сценарии</h3>
        {trace.scenarios.length === 0 ? (
          <p className={styles.muted}>—</p>
        ) : (
          <div className={styles.list}>
            {trace.scenarios.map((scenario, index) => (
              <article
                className={styles.scenario}
                key={`${scenario.scenario_id}-${index}`}
                aria-label={`Сценарий ${scenario.scenario_id}`}
              >
                <dl className={styles.scenarioFields}>
                  <div>
                    <dt>ID</dt>
                    <dd translate="no">{scenario.scenario_id}</dd>
                  </div>
                  <div>
                    <dt>Уверенность</dt>
                    <dd>{percentFormatter.format(scenario.confidence)}</dd>
                  </div>
                  <div className={styles.reason}>
                    <dt>Причина</dt>
                    <dd>{scenario.reason || "—"}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>

      <dl className={styles.summary}>
        <div>
          <dt>Альтернативы</dt>
          <dd>
            {trace.alternatives.length
              ? trace.alternatives.map((item, index) => (
                  <span
                    className={styles.alternative}
                    key={`${item.scenario_id}-${index}`}
                  >
                    <span translate="no">{item.scenario_id}</span>{" "}
                    {percentFormatter.format(item.confidence)}
                  </span>
                ))
              : "—"}
          </dd>
        </div>
      </dl>

      <section className={styles.block}>
        <h3>Состояние диалога</h3>
        <dl className={styles.flags} aria-label="Состояния реплики">
          <div>
            <dt>Уточнение</dt>
            <dd data-active={trace.needs_clarification}>
              {trace.needs_clarification
                ? "Требуется уточнение"
                : "Не требуется"}
            </dd>
          </div>
          <div>
            <dt>Передача оператору</dt>
            <dd data-active={trace.handoff}>
              {trace.handoff ? "Требуется оператор" : "Не требуется"}
            </dd>
          </div>
          <div>
            <dt>Подтверждение</dt>
            <dd data-active={trace.requires_confirmation}>
              {trace.requires_confirmation
                ? "Требуется подтверждение"
                : "Не требуется"}
            </dd>
          </div>
          <div>
            <dt>Продолжение диалога</dt>
            <dd data-active={trace.is_continuation}>
              {trace.is_continuation ? "Да" : "Нет"}
            </dd>
          </div>
        </dl>
        {trace.requires_confirmation ? (
          <p className={styles.confirmation}>Действие ещё не выполнено</p>
        ) : null}
      </section>

      <section className={styles.block}>
        <h3>Параметры (slots)</h3>
        {slots.length ? (
          <dl className={styles.summary}>
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
      </section>

      <section className={styles.block}>
        <h3>Действия</h3>
        {trace.actions.length ? (
          <ul className={styles.actions}>
            {trace.actions.map((action, index) => (
              <li key={`${action}-${index}`}>{action}</li>
            ))}
          </ul>
        ) : (
          <p className={styles.muted}>Действия не выполнялись</p>
        )}
      </section>

      <section className={styles.block}>
        <h3>Длительность этапов</h3>
        <dl className={styles.latency} aria-label="Длительность этапов">
          {Object.entries(trace.latency_ms).map(([key, value]) => (
            <div key={key}>
              <dt>{latencyLabels[key as keyof typeof latencyLabels]}</dt>
              <dd>{ms(value)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </section>
  );
}
