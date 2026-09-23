# Backend

Backend owner: Tim.

## Current stack decision
Because the repository had no application framework after Phase 0, the initial backend stack is:
- Python
- FastAPI
- Pydantic
- OpenAI SDK
- pytest

This is an engineering decision, not a claim about a pre-existing stack.

## Windows setup

From repository root:

    py -m venv .venv
    .venv\Scripts\activate
    py -m pip install -r backend\requirements.txt

If `python` is the configured launcher, use it instead of `py`.

## Run current backend

    py -m uvicorn backend.app.main:app --reload

Current implemented endpoint:

    GET /health

The customer turn endpoint is intentionally NOT defined yet. It will be added only with the real LLM router and then recorded in `.codex/INTEGRATION_CONTRACT.md`.

## Tests

    py -m pytest backend\tests -q

Do not mark these tests as passing until the command has actually been run on the current commit.

## Next backend target

Implement structured OpenAI LLM routing against the official scenario catalog:
- include `description`, `not_this_if`, examples, priority and relevant dialogue state;
- request structured output;
- validate all scenario IDs;
- measure real router latency;
- do not hardcode dev utterances.
