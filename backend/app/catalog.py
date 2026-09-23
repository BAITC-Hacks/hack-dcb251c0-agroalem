from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
SCENARIOS_PATH = ROOT / "starter-kit" / "scenarios.json"


@dataclass(frozen=True)
class ScenarioCatalog:
    scenarios: dict[str, dict[str, Any]]
    system_intents: dict[str, dict[str, Any]]

    @property
    def valid_ids(self) -> set[str]:
        return set(self.scenarios) | set(self.system_intents)


@lru_cache(maxsize=1)
def load_catalog() -> ScenarioCatalog:
    data = json.loads(SCENARIOS_PATH.read_text(encoding="utf-8"))

    scenarios = {
        item["scenario_id"]: item
        for item in data.get("scenarios", [])
    }
    system_intents = {
        item["id"]: item
        for item in data.get("system_intents", [])
    }

    if len(scenarios) != 40:
        raise ValueError(f"Expected 40 business scenarios, got {len(scenarios)}")

    required_system = {"SYS_OUT_OF_SCOPE", "SYS_UNCLEAR", "SYS_GOODBYE"}
    missing = required_system - set(system_intents)
    if missing:
        raise ValueError(f"Missing system intents: {sorted(missing)}")

    return ScenarioCatalog(
        scenarios=scenarios,
        system_intents=system_intents,
    )
