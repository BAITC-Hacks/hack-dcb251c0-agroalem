from __future__ import annotations

from .catalog import load_catalog
from .schemas import RouterOutput


def validate_router_output(result: RouterOutput) -> RouterOutput:
    catalog = load_catalog()
    valid_ids = catalog.valid_ids

    unknown = {
        item.scenario_id
        for item in [*result.scenarios, *result.alternatives]
        if item.scenario_id not in valid_ids
    }
    if unknown:
        raise ValueError(f"Router returned unknown scenario IDs: {sorted(unknown)}")

    return result
