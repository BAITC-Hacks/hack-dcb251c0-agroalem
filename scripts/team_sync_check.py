#!/usr/bin/env python3
from __future__ import annotations

import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BRANCHES = ["main", "tim/backend", "danil/frontend"]

def run(*args: str) -> tuple[int, str]:
    p = subprocess.run(["git", *args], cwd=ROOT, text=True, capture_output=True)
    return p.returncode, (p.stdout or p.stderr).strip()

def section(title: str) -> None:
    print(f"\n== {title} ==")

def state_marker(path: str) -> None:
    p = ROOT / path
    if not p.exists():
        print(f"{path}: MISSING")
        return
    text = p.read_text(encoding="utf-8", errors="replace")
    marker = re.search(r"(?im)^## Last synced[^\n]*\n+`?([^`\n]+)`?", text)
    objective = re.search(r"(?im)^## Current objective\n+([^\n]+)", text)
    print(f"{path}:")
    print(f"  sync: {(marker.group(1).strip() if marker else 'UNKNOWN')}")
    print(f"  objective: {(objective.group(1).strip() if objective else 'UNKNOWN')}")

def recent(ref: str) -> None:
    code, out = run("log", "-3", "--date=short", "--pretty=format:%h %ad %s", ref)
    print(f"{ref}:\n{out}" if code == 0 else f"{ref}: unavailable")

def main() -> int:
    code, _ = run("rev-parse", "--show-toplevel")
    if code:
        print("Not inside a Git repository.")
        return 2

    section("fetch")
    code, out = run("fetch", "origin", "--prune")
    print(out or ("OK" if code == 0 else "FAILED"))

    _, branch = run("branch", "--show-current")
    _, head = run("rev-parse", "--short=12", "HEAD")
    section("local")
    print(f"branch: {branch or 'DETACHED'}")
    print(f"HEAD:   {head}")
    _, status = run("status", "--short")
    print("working tree: clean" if not status else "working tree: DIRTY\n" + status)

    section("upstream")
    code, upstream = run("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}")
    if code:
        print("upstream: NONE")
    else:
        print(f"upstream: {upstream}")
        code, counts = run("rev-list", "--left-right", "--count", f"HEAD...{upstream}")
        if code == 0:
            ahead, behind = counts.split()
            print(f"ahead: {ahead}; behind: {behind}")
            if int(behind):
                print("WARNING: local branch is behind upstream")

    section("recent commits")
    for name in BRANCHES:
        recent(f"origin/{name}")
        print()

    section("state markers")
    state_marker(".codex/TIM_STATE.md")
    state_marker(".codex/DANIL_STATE.md")

    section("warnings")
    warned = False
    if status:
        print("- Uncommitted changes exist. Do not discard or mix unrelated work.")
        warned = True
    if branch == "main":
        print("- You are on main. Feature work belongs on a role branch.")
        warned = True
    if branch not in ("main", "tim/backend", "danil/frontend"):
        print(f"- Non-standard branch: {branch or 'DETACHED'}. Confirm role before editing.")
        warned = True
    if not warned:
        print("No obvious sync warning detected. Still read required coordination files.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
