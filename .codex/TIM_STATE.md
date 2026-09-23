# Tim state

Role: backend + integration owner
Branch: `tim/backend`
Updated: 2026-09-23 by Tim's integration agent.

## Current objective
FIRST REAL ROUTING BASELINE, followed by integration with FIRST REAL TEXT E2E UI. Do not tune before measuring the live baseline.

## Last completed goal
Hardened the existing text milestone in code and executed offline regression checks. No architecture redesign and no model/prompt/threshold tuning.

## Changes in this target
- Whitespace-only text/session identifiers are rejected by the existing request model; surrounding whitespace is trimmed.
- Medium-confidence operator handoff no longer also sets clarification=true.
- Handoff text no longer claims a completed operator transfer: this demo has no operator executor yet.
- Prediction generation rejects invalid/duplicate input IDs before its provider calls and can checkpoint each successful result.
- Prediction/report writes are atomic UTF-8 replacements, including nested output directories.
- Baseline runner records model, Git commit, dataset SHA-256, progress, failure status and the official evaluator output.
- Partial failures are not labelled a completed baseline. Raw provider exception messages are not written to reports.
- Baseline --help and missing-key preflight work without importing the OpenAI SDK.

## Commands actually run and evidence
Environment: isolated Linux container, NOT Tim's or Danil's Windows PC.
Python 3.13.5; pytest 9.0.2; Pydantic 2.13.4.

`python -m pytest backend/tests/test_baseline_regressions.py backend/tests/test_policy_transitions_offline.py -q`
Result: 47 passed in 0.71s.

`python -m backend.scripts.run_baseline --help`
Result: exit 0.

`python -m backend.scripts.run_baseline --smoke-only`
Result: exit 2; OPENAI_API_KEY missing. No paid/live request was made.

The official evaluate.py bytes were checked against source blob d79287b5ceb6a4ae78be239fd80edd841cbd3d61. Its subprocess wiring was exercised on THREE UNIT-FIXTURE rows, not the official 104-item live baseline.

## Verification limits
- The 47 checks cover the new offline regressions, not the complete repository pytest suite.
- No usable OpenAI SDK, provider credentials, or outbound package-install network is available in this execution container.
- No successful live smoke, official 104 live predictions, measured routing accuracy, or browser-to-live-backend E2E is claimed.
- The earlier path suspicion was checked: parents[2] correctly points to repository root and was not changed.

## Evaluation baseline
NOT MEASURED. Current model remains the existing configured model; no tuning performed.

## API contract status
POST /v1/turn/text is unchanged in shape. Text/session whitespace is normalized before length validation. No voice endpoint added. trace.actions remains empty until real execution exists.

## Last synced commit
`ebc958ec4a1d1a17c078414d8b2fe7c7c6c88caa`

## Next exact target action
On an authorized workstation with the ignored .env.local configured: inspect dirty files, fetch the role branch without discarding local work, install declared dependencies, run the COMPLETE `python -m pytest backend/tests -q`, then run `python -m backend.scripts.run_baseline`. Record actual smoke, 104-item metrics, model and failure cases before tuning. Keep PR #3 draft until this evidence exists.
