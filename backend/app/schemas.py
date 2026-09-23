from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


Language = Literal["ru", "kk", "mixed", "unknown"]


class ScenarioDecision(BaseModel):
    scenario_id: str
    confidence: float = Field(ge=0.0, le=1.0)
    reason: str = Field(min_length=1, max_length=300)


class AlternativeDecision(BaseModel):
    scenario_id: str
    confidence: float = Field(ge=0.0, le=1.0)


class RouterOutput(BaseModel):
    scenarios: list[ScenarioDecision] = Field(default_factory=list)
    alternatives: list[AlternativeDecision] = Field(default_factory=list)
    language: Language
    slots: dict[str, Any] = Field(default_factory=dict)
    is_continuation: bool = False

    @field_validator("scenarios")
    @classmethod
    def non_empty_reasoned_scenarios(
        cls, value: list[ScenarioDecision]
    ) -> list[ScenarioDecision]:
        seen: set[str] = set()
        for item in value:
            if item.scenario_id in seen:
                raise ValueError(f"Duplicate scenario_id: {item.scenario_id}")
            seen.add(item.scenario_id)
        return value


class LatencyTrace(BaseModel):
    stt: float | None = Field(default=None, ge=0)
    triage: float | None = Field(default=None, ge=0)
    router: float | None = Field(default=None, ge=0)
    response: float | None = Field(default=None, ge=0)
    tts_first_audio: float | None = Field(default=None, ge=0)
    total: float | None = Field(default=None, ge=0)


class TurnTrace(BaseModel):
    language: Language
    scenarios: list[ScenarioDecision] = Field(default_factory=list)
    alternatives: list[AlternativeDecision] = Field(default_factory=list)
    slots: dict[str, Any] = Field(default_factory=dict)
    actions: list[str] = Field(default_factory=list)
    is_continuation: bool = False
    needs_clarification: bool = False
    handoff: bool = False
    requires_confirmation: bool = False
    latency_ms: LatencyTrace = Field(default_factory=LatencyTrace)


class TurnResponse(BaseModel):
    session_id: str
    turn: int = Field(ge=1)
    transcript: str
    assistant_text: str
    trace: TurnTrace
