# Project truth

Status: coordination bootstrap. This file is the shared truth layer and must be corrected when repository evidence proves it wrong.

## Source priority
1. Current committed code.
2. Starter-kit/source files supplied for the hackathon.
3. Official task specification.
4. Committed team decisions in this repository.
5. Engineering inference, explicitly marked as inference.

Chat memory is not evidence.

## Project objective
Build a Voice Router web application where an LLM selects and continues business scenarios, exposes traceability after each turn, supports Russian/Kazakh including mixed speech, handles uncertainty/handoff, and requires confirmation before irreversible actions.

## Verified/planned facts from the two-computer specification
- 40 business scenarios.
- 3 system intents: `SYS_OUT_OF_SCOPE`, `SYS_UNCLEAR`, `SYS_GOODBYE`.
- 104 development utterances.
- Scenario metadata includes `description`, `not_this_if`, examples, priority, slots, confirmation and handoff information.
- A classic hard-coded intent classifier must not become the decision layer.
- Test-utterance hardcoding and opaque black-box routing are prohibited.

These facts came from Tim's two-computer specification and must be reconciled against the actual starter kit during Phase 0. Repository/source evidence wins on conflict.

## Routing policy carried from the same specification
- confidence >= 0.75: run selected scenario.
- confidence 0.45 to < 0.75: `SYS_UNCLEAR`, one short clarification, surface two most likely alternatives.
- confidence < 0.45 twice in a row: operator handoff.
- Multi-intent: urgent first; remaining scenarios follow mention order.
- Continuation should continue active scenario and fill slots rather than blindly full-route every turn.
- Topic switch pushes active scenario to a stack, handles the new scenario, then returns when appropriate.

## Anti-hallucination
Never invent scenario IDs/domain facts/endpoints/transports/frameworks/providers/latency/test results/success states. Use `UNKNOWN` or `BLOCKED` until verified.

## Current remote-repository facts at bootstrap
- Default branch: `main`.
- Remote history initially contained only one initial README commit.
- Backend/frontend runtime stacks are currently `UNKNOWN` from remote Git alone.
- Local dependencies and runnable commands remain `UNKNOWN` until Phase 0 inspects `C:\Users\boostseller\Documents\HACKALEM\VOICE router`.

## Ownership
Tim owns backend decisions and final integration. Danil owns frontend implementation. See `docs/TEAM_SPLIT.md`.
