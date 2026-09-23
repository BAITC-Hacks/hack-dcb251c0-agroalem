# Tim -> Danil handoff

## 2026-09-23 — shared starter kit integrated; backend foundation started

Backend branch:
`tim/backend`

Incoming Danil work reviewed:
- commit `1b9e583d6bf8dfcf44c600d30ed11acf2c91d7bf`;
- official starter kit and non-conflicting shared docs imported into `main`;
- Danil's larger overlapping documentation remains visible in draft PR #2 for deliberate reconciliation.

Backend now contains:
- official catalog loader;
- structured routing/trace schemas;
- unknown scenario-ID validation;
- `GET /health`;
- backend tests (authored, not yet locally executed).

## Frontend action
Do not bind customer UI to a guessed turn endpoint yet.

Use `.codex/INTEGRATION_CONTRACT.md` as the domain shape. Continue UI work behind an adapter/mock boundary if needed.

## Contract status
- concrete health endpoint: `GET /health`;
- customer turn endpoint/transport: `UNKNOWN`;
- STT/TTS endpoints: `UNKNOWN`;
- real latency: unavailable until measured.

## Next backend handoff expected
After the real LLM router is implemented and tested, Tim will publish the verified turn route/transport and sample real response payload.
