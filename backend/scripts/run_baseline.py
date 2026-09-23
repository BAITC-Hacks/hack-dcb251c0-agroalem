from __future__ import annotations

import argparse
import hashlib
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from backend.app.config import load_settings
from backend.app.evaluation import (
    DEV_UTTERANCES_PATH, RouterLike, generate_predictions, load_dev_utterances,
    prediction_ids, select_smoke_utterances, write_predictions, write_text_atomic,
)

ROOT = Path(__file__).resolve().parents[2]
EVALUATE_PATH = ROOT / "starter-kit" / "evaluate.py"


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Live RU/KK/mixed smoke and official routing baseline.")
    parser.add_argument("--smoke-only", action="store_true")
    parser.add_argument("--output", type=Path, default=Path("predictions.json"))
    parser.add_argument("--report", type=Path, default=Path("baseline-report.txt"))
    return parser.parse_args(argv)


def _git_head() -> str:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True,
            text=True, encoding="utf-8", timeout=5, check=False,
        )
        return result.stdout.strip() if result.returncode == 0 else "UNAVAILABLE"
    except (OSError, subprocess.SubprocessError):
        return "UNAVAILABLE"


def execute_baseline(
    router: RouterLike,
    *,
    model: str,
    output_path: Path,
    report_path: Path,
    smoke_only: bool = False,
    dev_path: Path = DEV_UTTERANCES_PATH,
    evaluate_path: Path = EVALUATE_PATH,
) -> int:
    """Record evidence; never replace a failed provider call with a prediction."""
    output_path = output_path.expanduser().resolve()
    report_path = report_path.expanduser().resolve()
    dev_path, evaluate_path = dev_path.resolve(), evaluate_path.resolve()
    checkpoint = output_path.with_name(output_path.stem + ".partial.json")
    protected = {output_path, report_path, checkpoint}
    if len(protected) != 3 or protected & {dev_path, evaluate_path}:
        raise ValueError("Output/report/checkpoint must be distinct from source files")
    utterances = load_dev_utterances(dev_path)
    report = [
        f"generated_at_utc={datetime.now(timezone.utc).isoformat()}",
        f"model={model}", f"git_commit={_git_head()}",
        f"dataset_sha256={hashlib.sha256(dev_path.read_bytes()).hexdigest()}",
        f"dataset_count={len(utterances)}", f"predictions={output_path}",
        "status=RUNNING", "", "SMOKE",
    ]

    def save() -> None:
        write_text_atomic(report_path, "\n".join(report) + "\n")

    save()
    completed = 0
    try:
        for item in select_smoke_utterances(utterances):
            result, latency = router.route(text=item["text"])
            line = (f'{item["id"]} lang={item["lang"]} '
                    f'expected={item["expected"]} predicted={prediction_ids(result)} '
                    f'router_ms={latency:.1f}')
            report.append(line)
            save()
            print(line, flush=True)
        if smoke_only:
            report.extend(["", "status=SMOKE_COMPLETE", "full_baseline=NOT_RUN"])
            save()
            return 0

        # A fresh partial file prevents an old checkpoint being mistaken for this run.
        write_predictions({}, checkpoint)

        def progress(done: int, total: int, identifier: str) -> None:
            nonlocal completed
            completed = done
            print(f"[{done}/{total}] {identifier}", flush=True)

        predictions = generate_predictions(
            router, utterances, checkpoint_path=checkpoint, progress=progress,
        )
        if set(predictions) != {item["id"] for item in utterances}:
            raise ValueError("Incomplete prediction set; evaluation refused")
        write_predictions(predictions, output_path)
        process = subprocess.run(
            [sys.executable, str(evaluate_path), str(output_path), str(dev_path)],
            cwd=ROOT, capture_output=True, text=True, encoding="utf-8",
            env={**os.environ, "PYTHONIOENCODING": "utf-8"}, timeout=60, check=False,
        )
        report.extend(["", f"completed_predictions={completed}", "OFFICIAL_EVALUATION", process.stdout.rstrip()])
        if process.stderr.strip():
            report.extend(["STDERR", process.stderr.rstrip()])
        report.append("status=COMPLETE" if process.returncode == 0 else "status=EVALUATOR_FAILED")
        save()
        print(process.stdout, end="", flush=True)
        if process.returncode == 0:
            checkpoint.unlink(missing_ok=True)
        return process.returncode
    except Exception as exc:
        # Exception messages may include provider request data. Keep them out of reports.
        report.extend(["", "status=FAILED", f"completed_predictions={completed}",
                       f"error_type={type(exc).__name__}",
                       "full_baseline=NOT_VERIFIED"])
        save()
        print(f"Baseline stopped ({type(exc).__name__}); report: {report_path}", file=sys.stderr)
        return 1


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    settings = load_settings()
    if not os.getenv("OPENAI_API_KEY", "").strip():
        print("OPENAI_API_KEY is missing. Set it in the local .env.local; never commit the key.", file=sys.stderr)
        return 2
    try:
        # Delay importing the SDK so --help and preflight work without it.
        from backend.app.router import LLMRouter
        if len(load_dev_utterances()) != 104:
            raise ValueError("The official baseline requires all 104 development utterances")
        router = LLMRouter(settings=settings)
        return execute_baseline(
            router, model=settings.router_model, output_path=args.output,
            report_path=args.report, smoke_only=args.smoke_only,
        )
    except (ImportError, OSError, ValueError) as exc:
        print(f"Baseline preflight failed ({type(exc).__name__}). Verify dependencies and starter-kit files.", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
