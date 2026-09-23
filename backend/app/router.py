from __future__ import annotations

from time import perf_counter
from typing import Any
from pydantic import ValidationError

from .catalog import ScenarioCatalog, load_catalog
from .config import Settings, load_settings
from .openai_client import OpenAIClient, ProviderError, ProviderTimeout
from .prompting import SYSTEM_INSTRUCTIONS, build_router_input
from .router_validation import validate_router_output
from .schemas import RouterModelOutput, RouterOutput

# Preserve the existing imports used by API and evaluation scripts.
RouterUnavailable = ProviderError
RouterTimeout = ProviderTimeout
RouterProviderError = ProviderError

class LLMRouter:
    def __init__(self, *, client: Any = None, settings: Settings | None = None,
                 catalog: ScenarioCatalog | None = None) -> None:
        self.settings = settings or load_settings()
        self.catalog = catalog or load_catalog()
        self._client = client
        self._owns_client = client is None

    @property
    def client(self) -> Any:
        if self._client is None:
            self._client = OpenAIClient(timeout=self.settings.provider_timeout)
        return self._client

    def close(self) -> None:
        if self._owns_client and self._client is not None:
            self._client.close()

    def route(self, *, text: str, history: list[dict[str, Any]] | None = None,
              active_scenario_id: str | None = None) -> tuple[RouterOutput, float]:
        started = perf_counter()
        response = self.client.responses.parse(
            model=self.settings.router_model,
            instructions=SYSTEM_INSTRUCTIONS,
            input=build_router_input(text=text, catalog=self.catalog,
                                     history=history, active_scenario_id=active_scenario_id),
            text_format=RouterModelOutput,
        )
        try:
            parsed = response.output_parsed
            if parsed is None:
                raise ValueError("No routing output")
            names = [slot.name for slot in parsed.slots]
            if len(names) != len(set(names)):
                raise ValueError("Duplicate slot names")
            normalized = RouterOutput(
                scenarios=parsed.scenarios, alternatives=parsed.alternatives,
                language=parsed.language,
                slots={slot.name: slot.value for slot in parsed.slots},
                is_continuation=parsed.is_continuation,
                clarification_question=parsed.clarification_question,
            )
            validate_router_output(normalized, self.catalog)
        except (ValueError, TypeError, AttributeError, ValidationError) as exc:
            raise ProviderError("OpenAI returned invalid routing decisions") from exc
        return normalized, (perf_counter() - started) * 1000
