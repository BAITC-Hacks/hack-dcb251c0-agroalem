from __future__ import annotations

import argparse
from pathlib import Path

from backend.app.evaluation import (
    generate_predictions,
    load_dev_utterances,
    write_predictions,
)
from backend.app.router import LLMRouter


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate Voice Router predictions for the official dev set."
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("predictions.json"),
        help="Output JSON path.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional first-N smoke limit. Omit for all 104 utterances.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    utterances = load_dev_utterances()
    if args.limit is not None:
        if args.limit < 1:
            raise SystemExit("--limit must be >= 1")
        utterances = utterances[: args.limit]

    router = LLMRouter()
    predictions = generate_predictions(router, utterances)
    write_predictions(predictions, args.output)

    print(f"Wrote {len(predictions)} predictions to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
