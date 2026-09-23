# Tim state

Role: backend + integration owner
Branch: `tim/backend`

## Current objective

Produce FIRST REAL ROUTING BASELINE. Do not tune before the baseline exists.

## Last completed engineering work

Implemented the first text routing vertical slice in code:

```text
text
-> official scenario catalog/context
-> OpenAI Responses API structured output
-> official scenario-ID validation
-> deterministic confidence/handoff policy
-> process-memory session state
-> text response
-> trace
```

Published concrete text transport:

```text
POST /v1/turn/text
```

## Verified repository facts

- Official starter kit is present in shared `main`.
- 40 business scenarios + 3 system intents are the routing catalog.
- Danil completed frontend Phase 0 in commit `3998d9da01719f8d17431a262952779d384010fb`.
- Danil reports no frontend application/framework yet and requested a real text/audio transport contract.
- Text transport is now defined; voice transport remains UNKNOWN.
- Initial backend stack is Python + FastAPI + Pydantic + OpenAI SDK + pytest.
- Current OpenAI structured-output implementation uses `client.responses.parse(..., text_format=...)`.
- Initial router model default is `gpt-5.6-luna`, overridable by `OPENAI_ROUTER_MODEL`.

## Backend components present in code

- official catalog loader;
- strict LLM structured-output schema;
- normalized domain router schema;
- unknown scenario-ID rejection;
- prompt built from official `description`, `not_this_if`, examples, priority, slots, actions, confirmation and handoff metadata;
- confidence policy;
- low-confidence streak;
- explicit operator handoff;
- up-to-10-item session routing history;
- FastAPI `GET /health`;
- FastAPI `POST /v1/turn/text`;
- measured router/response/total timings;
- tests for catalog, validation, router normalization, policy, API and evaluation mapping;
- official dev-set prediction runner (`python -m backend.scripts.generate_predictions`);
- GitHub backend test workflow.

## Safety/trace decisions

- No configured scenario action is reported as executed; `trace.actions=[]` until executor exists.
- Unknown STT/TTS timings remain null.
- API credentials are server-side environment only.
- Clarification text may come from the router as a short customer-facing question, while reason remains concise operational trace and not chain-of-thought.

## Immediate execution sequence

1. Fix confidence streak bug. ✅
2. Run pytest locally.
3. Commit + push.
4. Run 3 live LLM smoke utterances.
5. Generate all 104 predictions.
6. Run official `evaluate.py`.
7. Record baseline.
8. Only then tune router/model/prompt.

Nearest-hour success criterion:
- Tim/backend: `FIRST REAL ROUTING BASELINE`.
- Danil/frontend: `FIRST REAL TEXT E2E UI`.
- Integrate only when both text milestones exist.

## Test/evidence status

Already verified from Danil bootstrap:
- starter-kit reference validation;
- `python -m py_compile starter-kit/evaluate.py`.

For current backend target:
- confidence streak bug is fixed: only consecutive `<0.45` turns advance handoff streak; medium/high confidence resets it;
- isolated regression pytest harness for decision policy passed: `7 passed in 0.07s`;
- this isolated harness is NOT a substitute for full repository pytest;
- full repository pytest is still pending on Tim's Windows environment because this execution environment lacks the real OpenAI SDK and cannot install it from the network;
- GitHub Actions jobs currently receive no runner (`runner_id=0`, zero steps), so they do not constitute a code test result;
- no live OpenAI request has yet been claimed as successful;
- no evaluation baseline has yet been measured.

## API contract status

Implemented text route:
- `POST /v1/turn/text`.

Documented errors:
- 422 validation;
- 503 provider not configured;
- 502 provider/structured-output failure;
- 504 provider timeout.

Voice/STT/TTS transport remains UNKNOWN.

## Open blockers

- GitHub Actions PR job is being queued but prior run received no runner (`runner_id=0`, zero steps), so CI infrastructure may be restricted by the organizer repository settings.
- Live LLM smoke/evaluation requires a valid server-side `OPENAI_API_KEY`.
- Danil branch remains diverged from main; his Phase 0 work is visible in draft PR #2 and must not be overwritten.
- Current session state is in-memory and not production durable.

## Decisions made

- Initial router model default: `gpt-5.6-luna`, with env override.
- Use current OpenAI Responses structured parsing rather than free-form JSON parsing.
- Implement text E2E before voice.
- Publish concrete transport only after route exists in code.
- Keep executor actions out of trace until actually proposed/executed.

## Commands/evidence actually performed through GitHub in this target

- Read mandatory startup/state/contract files.
- Read current Tim/Danil branch deltas.
- Read Danil fresh Phase 0 commit and handoff.
- Checked current official OpenAI SDK structured-output usage.
- Added router/policy/session/API/test/CI code to `tim/backend`.
- Added backend CI workflow to shared `main`.

## Last known shared main

Shared main advanced with backend CI workflow after the previous starter-kit sync.

## Next exact target action

1. On Tim PC run `py -m pytest backend\\tests -q`.
2. Commit/push only if the local branch has additional unpushed changes; GitHub branch already contains the streak fix.
3. With server-side credentials run `py -m backend.scripts.generate_predictions --limit 3 --output smoke_predictions.json`.
4. If all 3 live routes are valid, run `py -m backend.scripts.generate_predictions --output predictions.json` for all 104.
5. Run `py starter-kit\\evaluate.py predictions.json starter-kit\\dev_utterances.json`.
6. Record exact model ID, commands, primary accuracy, full match, multi-intent recall, language/type breakdown and failure pairs.
7. Only after that begin tuning.
