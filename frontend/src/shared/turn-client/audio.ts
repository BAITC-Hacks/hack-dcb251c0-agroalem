/** Browser-to-backend audio transport. Never calls providers or holds API keys. */
export class AudioApiError extends Error {
  constructor(message: string, readonly code: string, readonly status: number | null = null) {
    super(message);
    this.name = "AudioApiError";
  }
}
export type Transcription = { text: string; latency_ms: number };
export type VoiceTurnEnvelope = {
  session_id: string;
  turn: number;
  transcript: string;
  assistant_text: string;
  trace: unknown;
  assistant_audio?: { mime_type: "audio/mpeg"; base64: string; ai_generated: true } | null;
  audio_error?: string | null;
};
const extensions: Record<string, string> = {
  "audio/webm": "webm", "video/webm": "webm", "audio/mp4": "mp4", "video/mp4": "mp4",
  "audio/x-m4a": "m4a", "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/mpga": "mpga",
  "audio/wav": "wav", "audio/x-wav": "wav",
};
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export class AudioApiClient {
  constructor(private readonly baseUrl = "/api", private readonly timeoutMs = 210_000) {}

  private async request<T>(path: string, init: RequestInit, read: (r: Response) => Promise<T>, signal?: AbortSignal): Promise<T> {
    const controller = new AbortController();
    let timedOut = false;
    if (signal?.aborted) throw new AudioApiError("Ожидание отменено.", "cancelled");
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}${path}`, { ...init, signal: controller.signal });
      if (!response.ok) {
        throw new AudioApiError(`Аудиозапрос завершился ошибкой HTTP ${response.status}.`, "http", response.status);
      }
      return await read(response);
    } catch (error) {
      if (timedOut) throw new AudioApiError("Истекло время ожидания аудиозапроса.", "timeout");
      if (controller.signal.aborted) throw new AudioApiError("Ожидание отменено; сервер мог продолжить обработку.", "cancelled");
      if (error instanceof AudioApiError) throw error;
      throw new AudioApiError("Не удалось получить аудиоответ сервера.", "network");
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  }

  private audioForm(blob: Blob): FormData {
    const mime = blob.type.split(";", 1)[0].trim().toLowerCase();
    if (!extensions[mime]) throw new AudioApiError("Нужен WebM, MP4/M4A, MP3 или WAV.", "unsupported_format");
    if (!blob.size || blob.size > 20 * 1024 * 1024) throw new AudioApiError("Размер записи должен быть от 1 байта до 20 MiB.", "invalid_size");
    const form = new FormData();
    form.append("file", blob, `recording.${extensions[mime]}`);
    return form;
  }

  async transcribe(blob: Blob, signal?: AbortSignal): Promise<Transcription> {
    return this.request("/v1/audio/transcriptions", { method: "POST", body: this.audioForm(blob) }, async (response) => {
      const value: unknown = await response.json();
      if (!isObject(value) || typeof value.text !== "string" || !value.text.trim()
          || typeof value.latency_ms !== "number" || !Number.isFinite(value.latency_ms) || value.latency_ms < 0) {
        throw new AudioApiError("Неверный формат транскрипции.", "invalid_contract");
      }
      return { text: value.text, latency_ms: value.latency_ms };
    }, signal);
  }

  async synthesize(text: string, signal?: AbortSignal): Promise<Blob> {
    text = text.trim();
    if (!text || text.length > 2000) throw new AudioApiError("Для озвучки нужно от 1 до 2000 символов.", "invalid_text");
    return this.request("/v1/audio/speech", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }),
    }, async (response) => {
      if (!response.headers.get("content-type")?.startsWith("audio/mpeg")) {
        throw new AudioApiError("Сервер не вернул MP3.", "invalid_contract");
      }
      const blob = await response.blob();
      if (!blob.size) throw new AudioApiError("Сервер вернул пустое аудио.", "invalid_contract");
      return blob;
    }, signal);
  }

  /** Apply the existing turnResultSchema to the returned trace before rendering. */
  async submitVoice(sessionId: string, blob: Blob, signal?: AbortSignal): Promise<VoiceTurnEnvelope> {
    sessionId = sessionId.trim();
    if (!sessionId || sessionId.length > 128) throw new AudioApiError("Неверный session_id.", "invalid_session");
    const form = this.audioForm(blob);
    form.append("session_id", sessionId);
    form.append("include_audio", "true");
    return this.request("/v1/turn/audio", { method: "POST", body: form }, async (response) => {
      const value: unknown = await response.json();
      if (!isObject(value) || value.session_id !== sessionId || !Number.isInteger(value.turn)
          || (value.turn as number) < 1 || typeof value.transcript !== "string"
          || typeof value.assistant_text !== "string" || !isObject(value.trace)) {
        throw new AudioApiError("Голосовой ответ не соответствует сессии или контракту.", "invalid_contract");
      }
      if (value.assistant_audio != null) {
        const audio = value.assistant_audio;
        if (!isObject(audio) || audio.mime_type !== "audio/mpeg" || typeof audio.base64 !== "string" || audio.ai_generated !== true) {
          throw new AudioApiError("Неверный формат озвучки.", "invalid_contract");
        }
      }
      return value as VoiceTurnEnvelope;
    }, signal);
  }
}
