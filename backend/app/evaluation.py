from __future__ import annotations

import json
import os
import tempfile
from collections.abc import Callable
from pathlib import Path
from typing import Any, Protocol

from .schemas import RouterOutput


ROOT = Path(__file__).resolve().parents[2]
DEV_UTTERANCES_PATH = ROOT / "starter-kit" / "dev_utterances.json"
SMOKE_LANGUAGES = ("ru", "kk", "mixed")


class RouterLike(Protocol):
    def route(
        self,
        *,
        text: str,
        history: list[dict[str, Any]] | None = None,
        active_scenario_id: str | None = None,
    ) -> tuple[RouterOutput, float]: ...


def load_dev_utterances(path: Path = DEV_UTTERANCES_PATH) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    utterances = data.get("utterances")
    if not isinstance(utterances, list):
        raise ValueError("dev_utterances.json must contain an utterances list")
    return utterances


def select_smoke_utterances(
    utterances: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    for language in SMOKE_LANGUAGES:
        item = next((row for row in utterances if row.get("lang") == language), None)
        if item is None:
            raise ValueError(f"No smoke utterance for language: {language}")
        selected.append(item)
    return selected


def prediction_ids(result: RouterOutput) -> list[str]:
    if not result.scenarios:
        return ["SYS_UNCLEAR"]

    primary = result.scenarios[0]
    if primary.scenario_id in {
        "SYS_OUT_OF_SCOPE",
        "SYS_UNCLEAR",
        "SYS_GOODBYE",
    }:
        return [primary.scenario_id]

    if primary.confidence < 0.75:
        return ["SYS_UNCLEAR"]

    return [item.scenario_id for item in result.scenarios]


def generate_predictions(
    router: RouterLike,
    utterances: list[dict[str, Any]],
    *,
    checkpoint_path: Path | None = None,
    progress: Callable[[int, int, str], None] | None = None,
) -> dict[str, list[str]]:
    # Validate the whole input before making any billable provider call.
    seen: set[str] = set()
    for item in utterances:
        identifier, text = item.get("id"), item.get("text")
        if not isinstance(identifier, str) or not identifier.strip():
            raise ValueError("Every utterance needs a non-empty string id")
        if identifier in seen:
            raise ValueError(f"Duplicate utterance id: {identifier}")
        if not isinstance(text, str) or not text.strip():
            raise ValueError(f"Empty utterance text: {identifier}")
        seen.add(identifier)

    predictions: dict[str, list[str]] = {}
    for item in utterances:
        # Gold labels and language labels are NOT supplied to the router.
        result, _ = router.route(text=item["text"])
        predictions[item["id"]] = prediction_ids(result)
        if checkpoint_path is not None:
            write_predictions(predictions, checkpoint_path)
        if progress is not None:
            progress(len(predictions), len(utterances), item["id"])
    return predictions


def write_text_atomic(output_path: Path, text: str) -> None:
    """Replace a complete UTF-8 file, including on Windows, without truncation."""
    output_path = output_path.expanduser().resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary: str | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", newline="\n",
            dir=output_path.parent, prefix=f".{output_path.name}.",
            suffix=".tmp", delete=False,
        ) as handle:
            temporary = handle.name
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, output_path)
        temporary = None
    finally:
        if temporary is not None:
            Path(temporary).unlink(missing_ok=True)


def write_predictions(
    predictions: dict[str, list[str]],
    output_path: Path,
) -> None:
    write_text_atomic(
        output_path,
        json.dumps(predictions, ensure_ascii=False, indent=2) + "\n",
    )
