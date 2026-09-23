# Integration contract v0.2: text + OpenAI audio

Owner: Tim/backend. Consumer: Danil/frontend. This is implemented in backend/app/main.py; no provider secrets belong in a browser.

## Text (existing request unchanged)

`POST /v1/turn/text`, JSON:

```json
{"session_id":"demo-1","text":"customer question"}
```

Both strings are trimmed; session_id has 1..128 characters, text 1..4000. Response retains session_id, turn, transcript, assistant_text and trace. Additional optional fields are assistant_audio and audio_error.

Accepted business routes now receive a separate grounded answer using official knowledge_base.json plus history and collected slots. Clarification/handoff/system-intent responses retain deterministic policy handling. No insurance operation, SMS, appointment or actual operator transfer is performed. actions remains [] and requires_confirmation is a catalogue requirement, not an execution result.

## Audio

`POST /v1/audio/transcriptions`: multipart file. Returns `{ "text": "...", "latency_ms": number }`; does not create a conversation turn.

`POST /v1/audio/speech`: JSON `{ "text": "..." }`, 1..2000 trimmed characters. Returns binary MP3 (`audio/mpeg`), `X-Audio-Generated-By: AI`, and measured `X-TTS-Duration-Ms`. No download URL or persistent recording is created.

`POST /v1/turn/audio`: multipart session_id, file, include_audio (boolean, default true). Executes transcription, the SAME text-turn function, and optional speech generation. Response keeps the text-turn fields and adds:

```json
{
  "assistant_audio": {
    "mime_type": "audio/mpeg",
    "base64": "<base64-encoded MP3 bytes>",
    "ai_generated": true
  },
  "audio_error": null
}
```

If TTS fails after text completion, HTTP 200 preserves text and trace; assistant_audio=null and audio_error identifies the failed audio stage. Retry ONLY speech, not the whole turn. include_audio=false omits speech.

Accepted MIME bases: audio/webm, video/webm, audio/mp4, video/mp4, audio/x-m4a, audio/mpeg, audio/mp3, audio/mpga, audio/wav, audio/x-wav. MIME parameters such as codecs=opus are accepted on an allowed base. Max file size: 20 MiB. Browser batch recording is limited to 60 seconds in the built-in client. Ogg is deliberately not advertised.

## Trace and latency

Original routing/flags/slots/actions fields remain. Unknown timing is null. Audio turns measure stt and may measure tts (new optional total-generation field). tts_first_audio remains null because this is batch audio, not measured user playback latency. total covers the completed server pipeline; it is not end-of-user-speech to first-heard-audio.

Confidence is an uncalibrated model score. Raw candidates remain in scenarios; needs_clarification/handoff must be rendered alongside them. Never interpret a candidate under clarification as an executed business action.

## Failures and sessions

413 size; 415 format; 422 validation; 429 occupied session capacity; 503 provider configuration/access; 502 provider/structured-response/network/quota failure; 504 provider timeout. No synthetic success fallback.

Transactions serialize one session. A failed router/answer call does not commit a partial turn. TTS can fail after the text transaction commits. Browser cancellation stops waiting only; it does not prove provider cancellation or rollback. No automatic retry or idempotency claim is made.

Memory is local to one process, bounded to 1024 sessions with idle eviction and a one-hour inactivity TTL. History stores the latest ten user+assistant turns. This is not a durable multi-worker backend.

## UI handoff

The built-in functional client at / is available without Node. Danil retains ownership of reference-driven design, layout and React controls. The new frontend audio.ts is transport-only; validate VoiceTurnEnvelope.trace with the existing turnResultSchema before rendering. Keys stay in the backend's ignored .env.local. Display an AI-voice disclosure.

Read this file from origin/tim/backend instead of merging all backend work into the frontend branch. Live provider and complete browser E2E validation remain required; fixture tests do not establish those results.
