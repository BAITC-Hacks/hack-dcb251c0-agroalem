# Tim -> Danil handoff

Status: initial shared coordination handoff.

## What changed
- Repository-level agent rules and two-machine coordination files added.
- Domain-level frontend/backend contract defined.
- No concrete API endpoint or transport invented.

## Danil action
1. Pull integrated shared bootstrap from `main`.
2. Create `danil/frontend`.
3. Run sync checker.
4. Audit real frontend stack.
5. Do not add keyword/intent routing logic to browser.

## Integration dependency
Wait for a verified backend text-turn endpoint/adapter before hard-wiring transport. A typed/mock adapter is allowed only if it mirrors `.codex/INTEGRATION_CONTRACT.md` and is clearly marked as mock.

## Known limitation
Backend runtime, endpoint, STT/TTS provider and latency availability are currently `UNKNOWN`.
