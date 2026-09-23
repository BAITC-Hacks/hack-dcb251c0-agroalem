from __future__ import annotations

import json
from typing import Any

from .catalog import ScenarioCatalog


SYSTEM_INSTRUCTIONS = """You are the routing layer for the Saqta Insurance Voice Router.
Your task is scenario selection, not general customer support.

Rules:
- Make the substantive routing decision from the supplied official scenario catalog.
- Never invent scenario IDs.
- Use description, not_this_if, examples, priority, slots, confirmation and handoff metadata.
- A classic keyword/intent classifier is not the decision layer.
- Handle Russian, Kazakh and mixed-language text.
- Multi-intent: urgent scenarios first, then remaining scenarios in order of mention.
- If the message continues the active scenario, set is_continuation=true.
- Keep reason short and operational. Do not expose hidden chain-of-thought.
- SYS_OUT_OF_SCOPE and SYS_GOODBYE may be selected directly when clearly applicable.
- Do not select SYS_UNCLEAR merely because confidence is low. Return the best candidate(s); deterministic policy applies thresholds.
- When uncertain, populate alternatives and provide one short clarification_question in the user's predominant language offering the two most likely interpretations.
- slots must contain only values explicitly present or safely normalized from the utterance/context. Do not invent missing values.
"""


def _scenario_for_prompt(item: dict[str, Any]) -> dict[str, Any]:
    examples = item.get("examples", {})
    return {
        "scenario_id": item["scenario_id"],
        "name": item.get("name"),
        "description": item.get("description"),
        "not_this_if": item.get("not_this_if", []),
        "priority": item.get("priority"),
        "required_slots": item.get("slots", {}).get("required", []),
        "optional_slots": item.get("slots", {}).get("optional", []),
        "actions": item.get("actions", []),
        "requires_confirmation": item.get("requires_confirmation", False),
        "handoff": item.get("handoff"),
        "examples": {
            "ru": examples.get("ru", [])[:2],
            "kk": examples.get("kk", [])[:2],
        },
    }


def build_catalog_context(catalog: ScenarioCatalog) -> str:
    payload = {
        "business_scenarios": [
            _scenario_for_prompt(item)
            for item in catalog.scenarios.values()
        ],
        "system_intents": list(catalog.system_intents.values()),
    }
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


def build_router_input(
    *,
    text: str,
    catalog: ScenarioCatalog,
    history: list[dict[str, Any]] | None = None,
    active_scenario_id: str | None = None,
) -> str:
    state = {
        "active_scenario_id": active_scenario_id,
        "recent_history": (history or [])[-10:],
    }
    return (
        "OFFICIAL_SCENARIO_CATALOG:\n"
        + build_catalog_context(catalog)
        + "\n\nDIALOG_STATE:\n"
        + json.dumps(state, ensure_ascii=False, separators=(",", ":"))
        + "\n\nCURRENT_USER_UTTERANCE:\n"
        + text
    )
