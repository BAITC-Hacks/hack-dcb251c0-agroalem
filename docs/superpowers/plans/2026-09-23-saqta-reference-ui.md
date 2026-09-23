# Saqta reference UI implementation plan

Owner: Danil. Branch: `danil/frontend`. Scope: `frontend/` and Danil-owned documentation; no backend, shared-contract, or branch integration changes.

Acceptance: match the user-provided light Saqta screen direction using semantic components; each turn retains its own trace; each scenario contains its own confidence/reason; API status flags and transcript remain visible; missing latency is `—`; empty send is disabled; mobile trace remains fully reachable above the composer.

## Ordered slice

1. Read project/role instructions and inspect `origin/tim/backend` handoff, text contract, and implementation without merging. Inspect frontend PR comments/reviews and current branch status.
2. Keep the existing text-first `HttpTurnClient`, validated response schema, session lifecycle, retry, cancellation, and error mapping. Do not invent audio transport or introduce runtime fixture fallback.
3. Add browser assertions for reference states, two-scenario reason/confidence grouping, transcript/status flags, null timings, whitespace input, and mobile geometry before changing presentation.
4. Implement the Saqta header, customer/assistant cards, pending/error/empty states, and selected trace as React components and CSS. Desktop uses two scrollable panels; mobile uses one conversation/trace scroll area plus a non-overlay composer row. Adapt spacing and latency columns for large text.
5. Review overflow, keyboard/focus behavior, and new-turn visibility. Add regression coverage for any concrete review finding and correct it before delivery.
6. Run format, lint, type checks, unit/transport tests, browser tests, and production build. Inspect desktop/mobile screenshots. Separately run a genuine OpenAI-backed text success and a missing-provider `503` against an isolated checkout of Tim's published backend; label all intercepted-response evidence separately.
7. Update frontend README, Danil state/handoff, and only frontend-owned task entries. Inspect ordinary/staged diff and secret boundaries. Commit atomically and push only `danil/frontend`; no merge or backend commit.

## Next slice boundary

Text transport is published at `POST /v1/turn/text`. Voice upload, supported audio formats, and assistant-audio response representation are still unknown. A local-only recorder may be prepared as a separate subsequent frontend slice; backend voice integration and assistant playback wait for Tim's published contract. No audio endpoint or new shared latency field is introduced here.
