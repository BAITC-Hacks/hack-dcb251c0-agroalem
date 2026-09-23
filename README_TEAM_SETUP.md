# Two-computer setup

This pack adds repository-based persistent memory and clear ownership for two Codex instances.

## Add these files to the repository

Copy:

```text
.codex/
docs/TEAM_SPLIT.md
docs/CASCADE_GOALS.md
prompts/
README_TEAM_SETUP.md
```

Keep the existing project `AGENTS.md`, `README.md`, `TASKS.md`, and official starter kit.

## Create branches

On Tim's computer:

```bash
git checkout main
git pull --ff-only
git checkout -b tim/backend
git push -u origin tim/backend
```

On Danil's computer:

```bash
git checkout main
git pull --ff-only
git checkout -b danil/frontend
git push -u origin danil/frontend
```

If the branches already exist, check them out instead of creating duplicates.

## Start Codex

Tim pastes:

```text
Read prompts/TIM_MASTER_PROMPT.md and follow it as the controlling instruction for this repository. Start with Phase 0.
```

Danil pastes:

```text
Read prompts/DANIL_MASTER_PROMPT.md and follow it as the controlling instruction for this repository. Start with Phase 0.
```

## Persistent memory

Codex session memory is not the project source of truth.

The repository is.

Tim memory:
- `.codex/TIM_STATE.md`
- `.codex/TIM_TO_DANIL.md`

Danil memory:
- `.codex/DANIL_STATE.md`
- `.codex/DANIL_TO_TIM.md`

Shared immutable truth:
- `.codex/PROJECT_TRUTH.md`

Shared contract:
- `.codex/INTEGRATION_CONTRACT.md`

Because these files are committed and pushed, a new Codex session can reconstruct the current state instead of guessing from an expired chat context.

## Daily / session restart rule

Every time Codex is restarted or a new context begins:

1. read project truth;
2. read own state;
3. read incoming handoff;
4. inspect `git status`;
5. inspect recent commits:

```bash
git log --oneline -15
```

6. continue from the exact `Next target` in own state.

## Integration cadence

Integrate when a milestone is actually usable, not after every keystroke.

Good integration points:
- text contract works;
- voice flow works;
- trace works;
- hard-case states work;
- final reproducibility works.

Both agents still commit/push each completed target action on their own branches.
