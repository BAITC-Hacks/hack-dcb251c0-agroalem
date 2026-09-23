#!/usr/bin/env python3
"""One-command local jury demo. Never changes Git or prints provider credentials."""
from __future__ import annotations
import argparse
import importlib.util
import os
from pathlib import Path
import subprocess
import sys
import venv

ROOT = Path(__file__).resolve().parent


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Install and run the local Voice Router jury demo")
    parser.add_argument("--no-install", action="store_true", help="Use this interpreter's installed dependencies")
    parser.add_argument("--check", action="store_true", help="Run the full repository backend test suite and exit")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args(argv)
    if sys.version_info < (3, 10):
        parser.error("Python 3.10+ is required")
    if not 1024 <= args.port <= 65535:
        parser.error("Use an unprivileged port from 1024 to 65535")
    missing = [name for name in ("scenarios.json", "knowledge_base.json", "dev_utterances.json")
               if not (ROOT / "starter-kit" / name).is_file()]
    if missing:
        print("Missing official starter-kit files: " + ", ".join(missing), file=sys.stderr)
        print("Run this file from the complete tim/backend checkout, not from a patch-only ZIP.", file=sys.stderr)
        return 2
    interpreter = Path(sys.executable)
    if not args.no_install:
        environment = ROOT / ".venv"
        interpreter = environment / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
        try:
            if not interpreter.exists():
                venv.EnvBuilder(with_pip=True).create(environment)
            subprocess.run([str(interpreter), "-m", "pip", "install", "-r", str(ROOT / "backend/requirements.txt")],
                           cwd=ROOT, check=True)
        except (OSError, subprocess.CalledProcessError) as exc:
            print(f"Dependency setup failed ({type(exc).__name__}). No server was started.", file=sys.stderr)
            return 2
    command = ([str(interpreter), "-m", "pytest", "backend/tests", "-q"] if args.check else
               [str(interpreter), "-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", str(args.port)])
    if not args.check:
        print(f"Open http://127.0.0.1:{args.port} . Ctrl+C stops the server.", flush=True)
        print("Use synthetic data only. Provider keys stay in the ignored .env.local.", flush=True)
    try:
        return subprocess.call(command, cwd=ROOT)
    except KeyboardInterrupt:
        return 130
    except OSError as exc:
        print(f"Launch failed ({type(exc).__name__}).", file=sys.stderr)
        return 2

if __name__ == "__main__":
    raise SystemExit(main())
