from __future__ import annotations

import json
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
) -> dict[str, list[str]]:
    predictions: dict[str, list[str]] = {}
    for item in utterances:
        utterance_id = item["id"]
        text = item["text"]
        result, _ = router.route(text=text)
        predictions[utterance_id] = prediction_ids(result)
    return predictions


def write_predictions(
    predictions: dict[str, list[str]],
    output_path: Path,
) -> None:
    output_path.write_text(
        json.dumps(predictions, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
