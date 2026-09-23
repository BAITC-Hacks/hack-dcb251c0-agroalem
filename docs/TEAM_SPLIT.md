# Team split

| Tim / backend workstation | Danil / frontend workstation |
| --- | --- |
| LLM router | Customer UI |
| Triage | Microphone UX |
| Dialogue state | Browser audio capture |
| Scenario data/rules | Audio playback |
| `not_this_if` and priority | Text fallback |
| Multi-intent | Supervisor panel |
| Confidence policy | Trace/confidence/alternatives UI |
| Scenario executor | Latency UI |
| Slots/actions | Clarification UX |
| Confirmation/handoff logic | Confirmation/handoff UX |
| Knowledge-base logic | Frontend tests |
| Mock/server adapters | API consumption/transport adapter |
| STT/TTS server adapters | Browser transport |
| Evaluation | UI integration |
| Domain/API contract | Contract consumption |
| Final integration and `main` | `danil/frontend` branch |

## Boundary
Danil must not implement scenario selection using browser keywords such as `text.includes(...)`. Routing is a backend/LLM responsibility.

Tim must not casually refactor React/CSS/microphone UI/trace layout. Minimal frontend edits are allowed only to unblock verified integration and must be handed back explicitly.

## Shared changes
Shared contract changes are coordinated through `.codex/INTEGRATION_CONTRACT.md` plus an outgoing handoff.
