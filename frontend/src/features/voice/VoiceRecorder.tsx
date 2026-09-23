import { useEffect, useRef, useState } from "react";
import styles from "./VoiceRecorder.module.css";

export type VoiceRecorderProps = {
  disabled: boolean;
  onRecorded: (blob: Blob) => void;
  onBusyChange?: (busy: boolean) => void;
};

type Recording = {
  stream: MediaStream | null;
  recorder: MediaRecorder | null;
  timer: ReturnType<typeof setTimeout> | null;
  chunks: Blob[];
  bytes: number;
  sending: boolean;
  onRecorded: (blob: Blob) => void;
  onBusyChange?: (busy: boolean) => void;
};

function releaseMicrophone(recording: Recording) {
  recording.stream?.getTracks().forEach((track) => track.stop());
  recording.stream = null;
}

function releaseRecording(recording: Recording) {
  if (recording.timer !== null) clearTimeout(recording.timer);
  const recorder = recording.recorder;
  if (recorder) {
    recorder.ondataavailable = null;
    recorder.onstop = null;
    recorder.onerror = null;
    if (recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // Track cleanup must still happen if the browser recorder has failed.
      }
    }
  }
  releaseMicrophone(recording);
  recording.chunks = [];
}

export function VoiceRecorder({
  disabled,
  onRecorded,
  onBusyChange,
}: VoiceRecorderProps) {
  const [phase, setPhase] = useState<
    "idle" | "permission" | "recording" | "stopping"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const active = useRef<Recording | null>(null);

  useEffect(
    () => () => {
      const recording = active.current;
      active.current = null;
      if (recording) {
        releaseRecording(recording);
        recording.onBusyChange?.(false);
      }
    },
    [],
  );

  function finish(
    recording: Recording,
    message: string | null = null,
    blob?: Blob,
  ) {
    if (active.current !== recording) return;
    active.current = null;
    releaseRecording(recording);
    setPhase("idle");
    setError(message);
    recording.onBusyChange?.(false);
    if (blob) recording.onRecorded(blob);
  }

  function stopAndSend(recording: Recording) {
    if (
      active.current !== recording ||
      recording.sending ||
      !recording.recorder
    )
      return;
    recording.sending = true;
    if (recording.timer !== null) clearTimeout(recording.timer);
    setPhase("stopping");
    try {
      recording.recorder.stop();
    } catch {
      finish(
        recording,
        "Не удалось завершить запись. Попробуйте ещё раз или введите текст.",
      );
    } finally {
      // Do not hold the device while the recorder queues its final data event.
      releaseMicrophone(recording);
    }
  }

  async function start() {
    if (disabled || active.current) return;
    setError(null);
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined" ||
      typeof MediaRecorder.isTypeSupported !== "function"
    ) {
      setError(
        "Запись голоса недоступна в этом браузере. Откройте сайт по HTTPS или введите текст.",
      );
      return;
    }
    const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(
      (mime) => MediaRecorder.isTypeSupported(mime),
    );
    if (!mimeType) {
      setError(
        "Браузер не поддерживает подходящий формат записи. Введите текст.",
      );
      return;
    }
    const recording: Recording = {
      stream: null,
      recorder: null,
      timer: null,
      chunks: [],
      bytes: 0,
      sending: false,
      onRecorded,
      onBusyChange,
    };
    active.current = recording;
    setPhase("permission");
    onBusyChange?.(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (active.current !== recording) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      recording.stream = stream;
      const recorder = new MediaRecorder(stream, { mimeType });
      recording.recorder = recorder;
      recorder.ondataavailable = ({ data }) => {
        if (active.current !== recording || !data.size) return;
        recording.bytes += data.size;
        if (recording.bytes > 20 * 1024 * 1024) {
          finish(
            recording,
            "Запись превышает 20 MiB. Запишите короче или введите текст.",
          );
          return;
        }
        recording.chunks.push(data);
      };
      recorder.onerror = () =>
        finish(
          recording,
          "Ошибка записи микрофона. Попробуйте ещё раз или введите текст.",
        );
      recorder.onstop = () => {
        if (active.current !== recording) return;
        if (!recording.sending) {
          finish(
            recording,
            "Запись прервалась. Попробуйте ещё раз или введите текст.",
          );
          return;
        }
        const blob = new Blob(recording.chunks, {
          type: recorder.mimeType || mimeType,
        });
        if (!blob.size) {
          finish(
            recording,
            "Запись пустая: звук не получен. Попробуйте ещё раз или введите текст.",
          );
          return;
        }
        finish(recording, null, blob);
      };
      recorder.start(1000);
      setPhase("recording");
      recording.timer = setTimeout(() => stopAndSend(recording), 60_000);
    } catch (cause) {
      const denied =
        cause instanceof DOMException &&
        (cause.name === "NotAllowedError" ||
          cause.name === "PermissionDeniedError");
      finish(
        recording,
        denied
          ? "Нет доступа к микрофону. Разрешите доступ в браузере или введите текст."
          : "Не удалось включить микрофон. Проверьте устройство или введите текст.",
      );
    }
  }

  return (
    <div className={styles.recorder}>
      <div className={styles.controls}>
        {phase === "idle" ? (
          <button
            type="button"
            className={styles.primary}
            disabled={disabled}
            onClick={() => void start()}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
            </svg>
            Начать запись
          </button>
        ) : (
          <>
            <span className={styles.status} role="status">
              {phase === "permission"
                ? "Ожидаем доступ к микрофону…"
                : phase === "recording"
                  ? "Идёт запись · до 60 секунд"
                  : "Подготавливаем запись…"}
            </span>
            {phase === "recording" && (
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  if (active.current) stopAndSend(active.current);
                }}
              >
                Остановить и отправить
              </button>
            )}
            <button
              type="button"
              className={styles.cancel}
              onClick={() => {
                if (active.current) finish(active.current);
              }}
            >
              Отменить запись
            </button>
          </>
        )}
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
