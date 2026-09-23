# Backend

Backend owner: Tim.

## Stack

The repository had no application framework before backend Phase 0, so the initial backend stack is an explicit team engineering decision:

- Python 3.10+
- FastAPI
- Pydantic v2
- OpenAI Python SDK
- pytest

The current OpenAI SDK dependency range is recorded in `backend/requirements.txt`.

## Router model

Initial default:

```text
gpt-5.6-luna
```

Override with:

```text
OPENAI_ROUTER_MODEL=<model-id>
```

The default is a starting model for routing evaluation, not a claim that it is already the best model. Model quality/latency must be measured against the official dev set.

## Windows setup

From repository root:

```powershell
py -m venv .venv
.venv\Scripts\activate
py -m pip install -r backend\requirements.txt
```

Configure server-side credentials:

```powershell
$env:OPENAI_API_KEY="..."
$env:OPENAI_ROUTER_MODEL="gpt-5.6-luna"
```

Never expose `OPENAI_API_KEY` in frontend code or commit it.

## Run

```powershell
py -m uvicorn backend.app.main:app --reload
```

Implemented endpoints:

```text
GET  /health
POST /v1/turn/text
```

Example text request:

```json
{
  "session_id": "demo-1",
  "text": "Я только что попал в аварию, что делать?"
}
```

## Tests

```powershell
py -m pytest backend\tests -q
```

GitHub PR CI also compiles `backend/app` and runs the backend tests.

## Current text pipeline

```text
text
  -> official scenario prompt
  -> OpenAI structured router
  -> scenario ID validation
  -> deterministic confidence/handoff policy
  -> official scenario/system response opening
  -> trace with measured router/response/total latency
```

No scenario executor, STT or TTS is implemented yet. Trace `actions` therefore remains empty.

## Next backend target

After tests and a live API smoke pass:
1. create dev-set prediction runner;
2. run official `starter-kit/evaluate.py`;
3. record real baseline and failure pairs;
4. iterate router prompt/model only from measured evidence.


## Official dev evaluation

First run a small live smoke:

```powershell
py -m backend.scripts.generate_predictions --limit 3 --output smoke_predictions.json
```

Then run the full 104-utterance dev set:

```powershell
py -m backend.scripts.generate_predictions --output predictions.json
py starter-kit\evaluate.py predictions.json starter-kit\dev_utterances.json
```

Do not commit `predictions.json` as a benchmark claim until the run command, model ID and measured results are recorded in `.codex/TIM_STATE.md`.

The prediction runner:
- preserves model-returned multi-intent order;
- maps uncertain business routes below the 0.75 policy threshold to `SYS_UNCLEAR`;
- keeps explicit system intents unchanged.


## Fast baseline command

After dependencies and `OPENAI_API_KEY` are available (the backend also loads ignored root `.env.local` automatically):

```powershell
py -m backend.scripts.run_baseline --smoke-only
py -m backend.scripts.run_baseline
```

The first command performs one live structured route for each language bucket: RU, KK and mixed.  
The second runs the same smoke, generates all 104 official dev predictions and invokes the official evaluator.

Output files are local-only and ignored by Git:
- `predictions.json`
- `baseline-report.txt`

Record the actual metrics in `.codex/TIM_STATE.md` before any prompt/model tuning.
