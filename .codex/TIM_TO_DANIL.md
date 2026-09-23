# Tim -> Danil handoff

## 2026-09-23 — text transport published on tim/backend

Backend target:
structured LLM router + deterministic policy + text turn API.

### Frontend can now integrate

```text
POST /v1/turn/text
```

Request:

```json
{
  "session_id": "frontend-session-id",
  "text": "customer text"
}
```

The exact response and error contract is now in:

```text
.codex/INTEGRATION_CONTRACT.md
```

### Important semantics

- Use backend scenario/confidence/reason/alternatives as returned. Do not recompute them.
- `actions` is currently empty because backend executor does not exist yet.
- `stt` and `tts_first_audio` are null for text turns.
- Backend returns 422 for invalid request, 503 when provider config is missing, 502 for routing/provider failure and 504 for timeout.
- Current session state is process-memory only.
- Voice upload/stream endpoint is still UNKNOWN.

### What Danil can build now

- text fallback form;
- conversation surface;
- frontend API adapter for `POST /v1/turn/text`;
- supervisor trace using returned fields;
- loading/error states for 422/502/503/504;
- fixture fallback only behind the adapter boundary.

### Do not implement yet

Do not guess:
- microphone upload endpoint;
- codec/MIME;
- streaming;
- assistant audio URL/blob shape.

Backend will hand those over when STT/TTS path exists.

### Backend verification status

Unit/integration tests are authored and GitHub CI is being enabled. Live OpenAI smoke/evaluation still requires server-side API credentials and must not be reported as passed before it is actually run.
