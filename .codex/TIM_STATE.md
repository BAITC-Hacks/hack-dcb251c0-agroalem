# Tim state

Role: backend + integration owner
Branch: `tim/backend`

## Current objective
Implement the first real structured LLM routing call against the official 40-scenario catalog.

## Last completed goal
Phase 0 remote audit completed and initial backend foundation added: official catalog loading, routing schemas, scenario-ID validation, FastAPI health endpoint, and backend tests.

## Verified repository facts
- `main` contains the official starter-kit files imported from Danil's verified commit.
- Official data contains 40 business scenarios and 3 system intents.
- Remote repository had no application/backend dependency manifest before this target.
- Danil commit `1b9e583d6bf8dfcf44c600d30ed11acf2c91d7bf` contains the larger shared bootstrap and starter-kit validation evidence.
- `tim/backend` is the backend work branch.
- Initial backend stack decision is Python + FastAPI + Pydantic + OpenAI SDK + pytest.

## Backend components working in code
- Official scenario catalog loader.
- Count/system-intent guards.
- Structured router output models.
- Unknown scenario-ID validator.
- FastAPI app with `GET /health`.
- Unit tests authored for catalog and router-ID validation.

## Test/evidence status
- Danil's incoming bootstrap records that `python -m py_compile starter-kit/evaluate.py` passed and official references were validated.
- Backend tests in this target have been authored but NOT executed from this chat.
- Local dependency installation has NOT been executed from this chat.

## Evaluation baseline
Not measured yet. No routing predictions exist yet.

## API contract status
- Shared domain response contract exists.
- Health endpoint is implemented.
- Customer turn endpoint/transport remains `UNKNOWN` until the real LLM route is implemented.

## Environment/dependencies
Declared in `backend/requirements.txt`.
Exact resolved package versions remain unverified until installation on Tim's workstation.

## Open blockers
- Need local Windows execution to install dependencies and run backend tests.
- Need `OPENAI_API_KEY` or approved provider credentials before a real LLM routing call can be verified.
- Draft PR #2 contains richer overlapping shared docs from Danil and needs deliberate reconciliation; do not overwrite Danil's role-owned state.

## Decisions made
- Git is persistent memory for both agents.
- Python/FastAPI selected for backend because no prior application stack existed and starter-kit tooling is Python.
- Final scenario decision will be LLM-based.
- No customer turn endpoint is published until it is actually implemented.
- Unknown latency remains null/unreported.

## Commands/evidence actually run in this session
- Inspected GitHub repository metadata, branches and commits.
- Reviewed Danil branch and commit `1b9e583`.
- Imported official starter-kit/shared docs from Danil into `main`.
- Fast-forwarded `tim/backend` to the shared main baseline.
- Added backend source/test files through GitHub.

## Last synced main commit before backend target
`e0823fc64dfe22340a08bd0dbc57c8046f1825a5`

## Next exact target action
On Tim's workstation first run:

    git fetch origin --prune
    git switch tim/backend
    git pull --ff-only origin tim/backend
    py -m venv .venv
    .venv\Scripts\activate
    py -m pip install -r backend\requirements.txt
    py -m pytest backend\tests -q

Record actual results here. If green, implement the OpenAI structured router using official scenario fields and add evaluation prediction generation.
