# Mandatory session start

Every agent session, on either computer:

1. `git status --short --branch`
2. `git fetch origin --prune`
3. `python scripts/team_sync_check.py`
4. Confirm current role branch.
5. Inspect recent commits for `main`, `tim/backend`, `danil/frontend`.
6. Read `PROJECT_TRUTH`, `INTEGRATION_CONTRACT`, `COMMIT_PROTOCOL`.
7. Read both state files.
8. Read incoming handoff.
9. Read role master prompt.
10. Check whether shared contract/truth changed after the state file's last sync marker.
11. Only then choose one next target.

If the working tree already contains unrelated changes, do not discard them and do not absorb them into your target. Record them and isolate your work.
