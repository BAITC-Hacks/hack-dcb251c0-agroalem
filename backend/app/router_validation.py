from __future__ import annotations
from .catalog import ScenarioCatalog, load_catalog
from .schemas import RouterOutput

def validate_router_output(result: RouterOutput, catalog: ScenarioCatalog | None = None) -> RouterOutput:
    catalog = catalog or load_catalog()
    unknown = {item.scenario_id for item in [*result.scenarios, *result.alternatives]
               if item.scenario_id not in catalog.valid_ids}
    if unknown:
        raise ValueError(f"Router returned unknown scenario IDs: {sorted(unknown)}")
    return result
