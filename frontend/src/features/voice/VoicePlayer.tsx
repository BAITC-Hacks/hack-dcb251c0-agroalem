import { useCallback, useEffect, useRef, useState } from "react";

import { AudioApiError } from "../../shared/turn-client/audio";
import styles from "./VoicePlayer.module.css";

type VoicePlayerProps = {
  audio?: {
    mime_type: "audio/mpeg";
    base64: string;
    ai_generated: true;
  } | null;
  audioError?: string | null;
  text: string;
  synthesize: (text: string, signal?: AbortSignal) => Promise<Blob>;
};

// Bound decoded media memory before creating a Blob or a browser object URL.
const maxAudioBytes = 20 * 1024 * 1024;
const unavailableMessage = "Не удалось озвучить ответ. Текст ответа сохранён.";

function decodeAudio(audio: NonNullable<VoicePlayerProps["audio"]>) {
  const encoded = audio.base64;
  if (
    audio.mime_type !== "audio/mpeg" ||
    audio.ai_generated !== true ||
    !encoded ||
    encoded.length > Math.ceil(maxAudioBytes / 3) * 4 ||
    encoded.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)
  ) {
    throw new Error("Invalid audio");
  }
  const binary = atob(encoded);
  if (!binary.length || binary.length > maxAudioBytes) {
    throw new Error("Invalid audio size");
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: "audio/mpeg" });
}

function synthesisError(error: unknown) {
  if (error instanceof AudioApiError) {
    if (error.code === "http" && error.status !== null) {
      return `Не удалось озвучить ответ (HTTP ${error.status}). Текст ответа сохранён.`;
    }
    if (error.code === "timeout") {
      return "Истекло время ожидания озвучки. Текст ответа сохранён.";
    }
    if (error.code === "invalid_text") {
      return "Для озвучки нужен ответ от 1 до 2000 символов. Текст ответа сохранён.";
    }
  }
  return unavailableMessage;
}

function NativePlayer({ blob, onError }: { blob: Blob; onError: () => void }) {
  const media = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const player = media.current;
    let source: string | null = null;
    try {
      source = URL.createObjectURL(blob);
      if (player) player.src = source;
    } catch {
      onError();
    }
    return () => {
      player?.pause();
      player?.removeAttribute("src");
      player?.load();
      if (source) URL.revokeObjectURL(source);
    };
  }, [blob, onError]);

  return (
    <audio
      ref={media}
      className={styles.audio}
      aria-label="Озвучка ответа"
      controls
      preload="none"
      onError={onError}
    >
      Браузер не поддерживает аудиоплеер. Ответ доступен текстом.
    </audio>
  );
}

type PlaybackState = {
  blob: Blob | null;
  error: string | null;
  loading: boolean;
  cancelled: boolean;
  attempted: boolean;
};

function initialPlayback(
  audio: VoicePlayerProps["audio"],
  audioError: VoicePlayerProps["audioError"],
): PlaybackState {
  const state: PlaybackState = {
    blob: null,
    error: audioError ? unavailableMessage : null,
    loading: false,
    cancelled: false,
    attempted: Boolean(audioError),
  };
  if (audio) {
    try {
      state.blob = decodeAudio(audio);
    } catch {
      state.error = "Не удалось прочитать аудио ответа. Текст ответа сохранён.";
      state.attempted = true;
    }
  }
  return state;
}

export function VoicePlayer({
  audio,
  audioError,
  text,
  synthesize,
}: VoicePlayerProps) {
  const [input, setInput] = useState({ audio, audioError, text });
  const [playback, setPlayback] = useState(() =>
    initialPlayback(audio, audioError),
  );
  const request = useRef<AbortController | null>(null);
  const playbackError = useCallback(() => {
    setPlayback((current) => ({
      ...current,
      error: "Не удалось воспроизвести аудио. Текст ответа сохранён.",
      attempted: true,
    }));
  }, []);

  // Reset before rendering a changed answer so old audio never belongs to new text.
  if (
    input.text !== text ||
    input.audioError !== audioError ||
    input.audio?.base64 !== audio?.base64 ||
    input.audio?.mime_type !== audio?.mime_type ||
    input.audio?.ai_generated !== audio?.ai_generated
  ) {
    setInput({ audio, audioError, text });
    setPlayback(initialPlayback(audio, audioError));
  }

  useEffect(() => {
    return () => {
      request.current?.abort();
      request.current = null;
    };
  }, [input]);

  async function speak() {
    if (request.current || !text.trim()) return;
    const controller = new AbortController();
    request.current = controller;
    setPlayback((current) => ({
      ...current,
      loading: true,
      error: null,
      cancelled: false,
      attempted: true,
    }));
    try {
      const blob = await synthesize(text, controller.signal);
      if (controller.signal.aborted || request.current !== controller) return;
      if (
        !blob.size ||
        blob.size > maxAudioBytes ||
        blob.type.split(";", 1)[0] !== "audio/mpeg"
      ) {
        throw new Error("Invalid synthesized audio");
      }
      setPlayback((current) => ({ ...current, blob }));
    } catch (failure) {
      if (controller.signal.aborted || request.current !== controller) return;
      setPlayback((current) => ({
        ...current,
        error: synthesisError(failure),
      }));
    } finally {
      if (request.current === controller) {
        request.current = null;
        setPlayback((current) => ({ ...current, loading: false }));
      }
    }
  }

  function cancel() {
    request.current?.abort();
    request.current = null;
    setPlayback((current) => ({ ...current, loading: false, cancelled: true }));
  }

  const { blob, error, loading, cancelled, attempted } = playback;
  return (
    <div className={styles.player}>
      <p className={styles.disclosure}>
        Голос создан ИИ. Воспроизведение — по нажатию.
      </p>
      {blob && <NativePlayer blob={blob} onError={playbackError} />}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <div className={styles.actions}>
          <span role="status">Готовим озвучку…</span>
          <button className={styles.button} type="button" onClick={cancel}>
            Отменить озвучку
          </button>
        </div>
      ) : (
        <>
          {cancelled && (
            <p role="status">
              Ожидание озвучки отменено. Сервер мог продолжить обработку.
            </p>
          )}
          {(!blob || error || cancelled) && (
            <button
              className={styles.button}
              type="button"
              disabled={!text.trim()}
              onClick={() => void speak()}
            >
              {attempted ? "Повторить озвучку" : "Озвучить ответ"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
