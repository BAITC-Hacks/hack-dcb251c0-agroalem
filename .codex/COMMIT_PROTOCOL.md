# COMMIT_PROTOCOL.md

Both machines must create atomic commits after every completed target action.

A "target action" is a coherent unit that leaves the repository in a meaningful state.

Good examples:

- router schema validation added and tested;
- one backend action implemented and tested;
- microphone capture flow completed;
- supervisor trace card completed;
- frontend integrated with one stable backend contract;
- routing regression fixed and evaluation rerun.

Bad examples:

- changed one variable name;
- saved a file;
- half-implemented a feature that does not run.

---

## Branch ownership

Canonical branches:

- `main` — stable integration branch; Tim owns final merges.
- `tim/backend` — Tim's normal work branch.
- `danil/frontend` — Danil's normal work branch.

Do not both develop directly on `main`.

Do not force-push shared branches.

Do not rewrite published history.

---

## Before each target action

Run:

```bash
git status
git pull --rebase origin <your-branch>
```

Only start when the worktree is understood.

If there are unknown local changes:
- inspect them;
- do not discard them blindly.

---

## After each target action

1. run the relevant tests/checks;
2. update your own state file;
3. update your outgoing handoff file if the other machine needs to know something;
4. inspect changes:

```bash
git status
git diff
```

5. stage only intended files;
6. inspect staged changes:

```bash
git diff --cached
```

7. commit;
8. push.

Example:

```bash
git add <specific-files>
git commit -m "backend(router): validate structured routing output"
git push origin tim/backend
```

Do not use `git add .` blindly when unrelated files are present.

---

## Commit naming

Tim/backend:

```text
backend(router): ...
backend(state): ...
backend(actions): ...
backend(api): ...
backend(eval): ...
backend(stt): ...
backend(tts): ...
test(backend): ...
docs(contract): ...
```

Danil/frontend:

```text
frontend(voice): ...
frontend(customer): ...
frontend(trace): ...
frontend(integration): ...
frontend(state): ...
test(frontend): ...
docs(frontend): ...
```

Shared integration:

```text
integration: merge frontend milestone ...
fix(integration): ...
docs(readme): ...
```

---

## Commit rule

Every commit must answer:

- what single goal does this commit complete?
- how was it checked?
- does it change the shared contract?

If the commit cannot answer those questions, it is probably too broad or incomplete.

---

## Integration rule

Danil pushes completed milestones to `danil/frontend`.

Tim merges only when:

- Danil's state file says the milestone is ready;
- frontend checks pass;
- any API-contract dependency is documented;
- Tim's backend branch is clean enough to integrate.

Recommended integration:

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
git merge --no-ff origin/tim/backend
git merge --no-ff origin/danil/frontend
```

Resolve conflicts deliberately.

After integration:
- run end-to-end checks;
- commit integration fixes separately;
- push `main`.

If the repository workflow already has PRs/CI, use them instead of inventing a competing process.
