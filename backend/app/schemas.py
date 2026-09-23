from __future__ import annotations
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator

Language = Literal["ru", "kk", "mixed", "unknown"]

class ScenarioDecision(BaseModel):
    scenario_id: str
    confidence: float = Field(ge=0.0, le=1.0)
    reason: str = Field(min_length=1, max_length=300)

class AlternativeDecision(BaseModel):
    scenario_id: str
    confidence: float = Field(ge=0.0, le=1.0)

class ExtractedSlot(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    value: str = Field(max_length=500)

class RouterModelOutput(BaseModel):
    scenarios: list[ScenarioDecision] = Field(default_factory=list)
    alternatives: list[AlternativeDecision] = Field(default_factory=list)
    language: Language
    slots: list[ExtractedSlot] = Field(default_factory=list)
    is_continuation: bool = False
    clarification_question: str | None = Field(default=None, max_length=300)

class RouterOutput(BaseModel):
    scenarios: list[ScenarioDecision] = Field(default_factory=list)
    alternatives: list[AlternativeDecision] = Field(default_factory=list)
    language: Language
    slots: dict[str, Any] = Field(default_factory=dict)
    is_continuation: bool = False
    clarification_question: str | None = Field(default=None, max_length=300)

    @field_validator("scenarios")
    @classmethod
    def unique_scenarios(cls, value: list[ScenarioDecision]) -> list[ScenarioDecision]:
        seen: set[str] = set()
        for item in value:
            if item.scenario_id in seen:
                raise ValueError(f"Duplicate scenario_id: {item.scenario_id}")
            seen.add(item.scenario_id)
        return value

class TextTurnRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=128)
    text: str = Field(min_length=1, max_length=4000)

    @field_validator("session_id", "text", mode="before")
    @classmethod
    def strip_input(cls, value: Any) -> Any:
        return value.strip() if isinstance(value, str) else value

class LatencyTrace(BaseModel):
    stt: float | None = Field(default=None, ge=0)
    triage: float | None = Field(default=None, ge=0)
    router: float | None = Field(default=None, ge=0)
    response: float | None = Field(default=None, ge=0)
    tts_first_audio: float | None = Field(default=None, ge=0)
    total: float | None = Field(default=None, ge=0)
    tts: float | None = Field(default=None, ge=0)

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

class AssistantAudio(BaseModel):
    mime_type: Literal["audio/mpeg"] = "audio/mpeg"
    base64: str
    ai_generated: Literal[True] = True

class TurnResponse(BaseModel):
    session_id: str
    turn: int = Field(ge=1)
    transcript: str
    assistant_text: str
    trace: TurnTrace
    assistant_audio: AssistantAudio | None = None
    audio_error: str | None = None

class SpeechRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)

    @field_validator("text", mode="before")
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        return value.strip() if isinstance(value, str) else value

class GroundedAnswer(BaseModel):
    model_config = ConfigDict(extra="forbid")
    assistant_text: str = Field(min_length=1, max_length=1600)
