import type { TurnResult } from "../../shared/turn-client/schema";
import styles from "./SupervisorTrace.module.css";

type Props = {
  result: TurnResult | null;
};

const latencyLabels: Record<keyof TurnResult["trace"]["latency_ms"], string> = {
  stt: "STT",
  triage: "Triage",
  router: "Router",
  response: "Response",
  tts_first_audio: "TTS first audio",
  total: "Total",
};

function ms(value: number | null) {
  return value === null ? "—" : `${Math.round(value)} ms`;
}

export function SupervisorTrace({ result }: Props) {
  if (!result) {
    return (
      <section className={styles.panel} aria-label="Supervisor trace">
        <div className={styles.eyebrow}>SUPERVISOR</div>
        <h2>Trace появится после первого ответа</h2>
        <p className={styles.muted}>
          Здесь отображаются только реальные данные backend. Пустые поля не
          заменяются выдуманными значениями.
        </p>
      </section>
    );
  }

  const { trace } = result;

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
            {trace.scenarios.map((scenario) => (
              <article className={styles.scenario} key={scenario.scenario_id}>
                <div className={styles.scenarioTop}>
                  <strong>{scenario.scenario_id}</strong>
                  <span>{Math.round(scenario.confidence * 100)}%</span>
                </div>
                <p>{scenario.reason}</p>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className={styles.flags}>
        <span>clarify: {trace.needs_clarification ? "yes" : "no"}</span>
        <span>handoff: {trace.handoff ? "yes" : "no"}</span>
        <span>confirm: {trace.requires_confirmation ? "yes" : "no"}</span>
        <span>continuation: {trace.is_continuation ? "yes" : "no"}</span>
      </div>

      <div className={styles.block}>
        <span className={styles.label}>Alternatives</span>
        <p className={styles.muted}>
          {trace.alternatives.length
            ? trace.alternatives
                .map(
                  (item) =>
                    `${item.scenario_id} ${Math.round(item.confidence * 100)}%`,
                )
                .join(" · ")
            : "—"}
        </p>
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
