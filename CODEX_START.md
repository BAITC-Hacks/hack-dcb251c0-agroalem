# Codex start here

Do not begin implementation from chat memory.

## 1. Sync
From repository root:

    python scripts/team_sync_check.py

On Windows, if `python` is unavailable:

    py scripts/team_sync_check.py

## 2. Read in this order
1. `AGENTS.md`
2. `.codex/PROJECT_TRUTH.md`
3. `.codex/INTEGRATION_CONTRACT.md`
4. `.codex/COMMIT_PROTOCOL.md`
5. `.codex/TIM_STATE.md`
6. `.codex/DANIL_STATE.md`
7. incoming handoff
8. role prompt

Tim incoming handoff: `.codex/DANIL_TO_TIM.md` and role prompt `prompts/TIM_MASTER_PROMPT.md`.

Danil incoming handoff: `.codex/TIM_TO_DANIL.md` and role prompt `prompts/DANIL_MASTER_PROMPT.md`.

## 3. Branch rule
- Tim works on `tim/backend`.
- Danil works on `danil/frontend`.
- `main` is integration/stable and is owned by Tim.

Danil first-time setup:

    git switch main
    git pull --ff-only origin main
    git switch -c danil/frontend
    git push -u origin danil/frontend

## 4. Evidence before claims
Current code and committed source material outrank chat memory. If local starter-kit files disagree with `.codex/PROJECT_TRUTH.md`, correct the truth file in the same atomic commit and record why.

## 5. End every target
Test -> update STATE -> update handoff/contract if needed -> inspect diff -> stage only relevant files -> inspect staged diff -> commit -> push.
