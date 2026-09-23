from __future__ import annotations

from time import perf_counter
from typing import Any

from openai import OpenAI

from .catalog import ScenarioCatalog, load_catalog
from .config import Settings, load_settings
from .prompting import SYSTEM_INSTRUCTIONS, build_router_input
from .router_validation import validate_router_output
from .schemas import RouterOutput


class RouterUnavailable(RuntimeError):
    pass


class LLMRouter:
    def __init__(
        self,
        *,
        client: OpenAI | None = None,
        settings: Settings | None = None,
        catalog: ScenarioCatalog | None = None,
    ) -> None:
        self.settings = settings or load_settings()
        self.catalog = catalog or load_catalog()
        self.client = client or OpenAI()

    def route(
        self,
        *,
        text: str,
        history: list[dict[str, Any]] | None = None,
        active_scenario_id: str | None = None,
    ) -> tuple[RouterOutput, float]:
        started = perf_counter()
        response = self.client.responses.parse(
            model=self.settings.router_model,
            instructions=SYSTEM_INSTRUCTIONS,
            input=build_router_input(
                text=text,
                catalog=self.catalog,
                history=history,
                active_scenario_id=active_scenario_id,
            ),
            text_format=RouterOutput,
        )
        elapsed_ms = (perf_counter() - started) * 1000

        parsed = response.output_parsed
        if parsed is None:
            raise RouterUnavailable("Model response did not contain parsed routing output")

        return validate_router_output(parsed), elapsed_ms
