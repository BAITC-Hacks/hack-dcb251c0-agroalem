# Commit protocol

## What counts as a target
A target is one complete, testable engineering result. Do not commit every keystroke and do not bundle unrelated work.

## Mandatory sequence
1. Implement one target.
2. Run real tests/evidence.
3. Update your STATE with objective, completed target, verified facts, commands actually run, tests/evidence, blockers, decisions, next exact action, branch and sync marker.
4. If the other developer is affected, update outgoing handoff.
5. If shared API/domain behavior changed, update `INTEGRATION_CONTRACT.md`.
6. `git diff`.
7. Stage only files for this target.
8. `git diff --cached`.
9. Commit atomically.
10. Push your role branch.

## Never claim
Do not record tests as passing unless they were run. Do not record a pushed commit unless push succeeded. Do not invent hashes, endpoints, latency or environment details.
