# DANIL_STATE.md — Danil/frontend persistent agent memory

Owner: Danil's computer / frontend Codex.

Only Danil's agent should normally edit this file.

At the end of EVERY completed target action, update this file in the same commit.

## Current branch
`danil/frontend`

## Current objective
Publish the shared documentation and official starter-kit bootstrap on `danil/frontend` and hand it to Tim for review.

## Last completed goal
Imported the official Codex packs, official starter-kit files, and source case document into the team repository.

## Verified facts about current frontend
- The remote repository initially contained only a one-line README.
- No frontend framework, dependency manifest, UI, or test runner exists yet.
- The official starter kit contains 40 business scenarios, 3 system intents, 104 development utterances, and 10 annotated dialogs.

## UI components currently working
- None.

## Voice capture/playback status
- Not implemented.

## Backend integration status
- Contract: `.codex/INTEGRATION_CONTRACT.md`
- Actual transport/endpoints: UNKNOWN until repository audit / Tim handoff.

## Open frontend blockers
- Frontend stack is not selected.
- Backend transport/endpoints remain `UNKNOWN` until Tim's audit and handoff.

## Decisions made
- Work on `danil/frontend`; Tim owns integration into `main`.
- OpenAI API is the initial LLM provider; no provider secret may be exposed in browser code.

## Latest commands actually run
- Starter-kit reference validation: 40 scenarios, 3 system intents, 43 slots, 31 actions, and 104 dev utterances; no missing references.
- `python -m py_compile starter-kit/evaluate.py` passed.
- Markdown relative-link validation passed.
- Secret scan passed and `.env.local` is ignored.

## Next exact target action
Commit and push this bootstrap, request Tim's review, then perform Phase 0 frontend audit after the shared foundation is integrated.

## Do not forget
- Do not invent backend endpoints.
- Do not implement routing logic in frontend.
- Do not fake latency.
- Keep text fallback.
- Trace must update after every user utterance.
- Commit and push after every completed target action.
