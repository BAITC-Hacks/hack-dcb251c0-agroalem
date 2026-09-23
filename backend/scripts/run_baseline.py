from __future__ import annotations

import argparse
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from backend.app.config import load_settings
from backend.app.evaluation import (
    DEV_UTTERANCES_PATH,
    generate_predictions,
    load_dev_utterances,
    prediction_ids,
    select_smoke_utterances,
    write_predictions,
)
from backend.app.router import LLMRouter


ROOT = Path(__file__).resolve().parents[2]
EVALUATE_PATH = ROOT / "starter-kit" / "evaluate.py"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run RU/KK/mixed smoke, then the official 104-item routing baseline."
    )
    parser.add_argument(
        "--smoke-only",
        action="store_true",
        help="Stop after the three live structured-routing smoke calls.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("predictions.json"),
        help="Full dev-set predictions output.",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=Path("baseline-report.txt"),
        help="Human-readable baseline report output.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    settings = load_settings()
    router = LLMRouter(settings=settings)
    utterances = load_dev_utterances()

    report: list[str] = [
        f"generated_at_utc={datetime.now(timezone.utc).isoformat()}",
        f"model={settings.router_model}",
        "",
        "SMOKE",
    ]

    for item in select_smoke_utterances(utterances):
        result, latency_ms = router.route(text=item["text"])
        predicted = prediction_ids(result)
        line = (
            f'{item["id"]} lang={item["lang"]} '
            f'expected={item["expected"]} predicted={predicted} '
            f'router_ms={latency_ms:.1f}'
        )
        print(line)
        report.append(line)

    if args.smoke_only:
        args.report.write_text("\n".join(report) + "\n", encoding="utf-8")
        print(f"Smoke complete. Report: {args.report}")
        return 0

    print(f"Generating predictions for {len(utterances)} utterances...")
    predictions = generate_predictions(router, utterances)
    write_predictions(predictions, args.output)

    proc = subprocess.run(
        [
            sys.executable,
            str(EVALUATE_PATH),
            str(args.output),
            str(DEV_UTTERANCES_PATH),
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
    )

    report.extend(
        [
            "",
            f"predictions={args.output}",
            "",
            "OFFICIAL_EVALUATION",
            proc.stdout.rstrip(),
        ]
    )
    if proc.stderr.strip():
        report.extend(["", "STDERR", proc.stderr.rstrip()])

    args.report.write_text("\n".join(report) + "\n", encoding="utf-8")

    print(proc.stdout, end="")
    if proc.stderr:
        print(proc.stderr, file=sys.stderr, end="")
    print(f"Baseline report: {args.report}")

    return proc.returncode


if __name__ == "__main__":
    raise SystemExit(main())
