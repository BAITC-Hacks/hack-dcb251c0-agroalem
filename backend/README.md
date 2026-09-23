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
