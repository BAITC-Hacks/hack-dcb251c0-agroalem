# Voice Router frontend

Owner: Danil/frontend.

## Stack

- React 19.3
- TypeScript 5.9
- Vite 8.3
- pnpm 11
- CSS Modules
- Zod
- Vitest + Testing Library
- Playwright
- ESLint + Prettier

## Install

```powershell
Set-Location frontend
pnpm install
```

The committed `pnpm-lock.yaml` is the reproducible dependency source.

## Run against Tim backend

Start the backend on its documented default port, then run the frontend:

```powershell
py -m uvicorn backend.app.main:app --reload
```

```powershell
Set-Location frontend
pnpm dev
```

Vite proxies the frontend API boundary:

```text
/api/v1/turn/text -> http://127.0.0.1:8000/v1/turn/text
```

For a deployed API, copy `.env.example` to an ignored local env file and set:

```text
VITE_API_BASE_URL=https://your-backend.example
```

This value is a URL, not a secret. Never put provider API keys in a `VITE_` variable.

## Verify

Run all static and unit/build checks:

```powershell
pnpm check
```

Run browser tests with intercepted deterministic responses at desktop and 360 px:

```powershell
pnpm test:e2e
```

With Tim's real backend already running, opt in to the real browser-to-backend smoke:

```powershell
$env:REAL_BACKEND="1"
pnpm exec playwright test e2e/real-backend.spec.ts --project=desktop-chromium
```

The live test is skipped by default so ordinary frontend checks never consume provider quota or require a secret.

## Current milestone

Implemented and verified text-only E2E UI:

- stable-session text input and conversation history;
- real `HttpTurnClient` for Tim's `POST /v1/turn/text`;
- runtime response validation with Zod;
- loading, cancellation, bounded-wait, and backend error states;
- selectable per-turn supervisor trace with all published fields and no stale-trace reuse;
- response-session validation and protection from late responses;
- `unknown` language and nullable latency rendering;
- explicit confirmation-required wording that does not claim an action ran;
- responsive access to conversation and trace.

Voice remains deliberately out of scope until Tim publishes the audio transport and assistant-audio contract.
