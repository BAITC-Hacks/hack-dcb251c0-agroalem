# Voice Router frontend

Owner: Danil/frontend.

## Stack

- React 19.3
- TypeScript 7
- Vite 8.3
- pnpm
- CSS Modules
- Zod
- Vitest + Testing Library

## Install

```powershell
cd frontend
pnpm install
```

Commit the generated `pnpm-lock.yaml` after the first verified install on Danil's workstation.

## Run against Tim backend

Start backend on port 8000, then:

```powershell
cd frontend
pnpm dev
```

Vite proxies:

```text
/api/v1/turn/text -> http://127.0.0.1:8000/v1/turn/text
```

Optional deployed API base:

```text
VITE_API_BASE_URL=https://your-backend.example
```

This value is a URL, not a secret. Provider API keys must never use a browser-public prefix.

## Verify

```powershell
pnpm typecheck
pnpm test
pnpm build
```

or:

```powershell
pnpm check
```

## Current milestone

Implemented text-only E2E UI boundary:
- text input;
- conversation history;
- real HTTP adapter for Tim's `POST /v1/turn/text`;
- runtime response validation with Zod;
- loading and backend error states;
- supervisor trace;
- missing latency renders as unavailable.

Voice remains deliberately out of scope until Tim publishes the audio contract.
