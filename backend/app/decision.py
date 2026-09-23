from __future__ import annotations

from dataclasses import dataclass

from .catalog import ScenarioCatalog
from .schemas import RouterOutput, ScenarioDecision
from .sessions import SessionState


HIGH_CONFIDENCE = 0.75
LOW_CONFIDENCE = 0.45


@dataclass(frozen=True)
class PolicyResult:
    primary: ScenarioDecision | None
    needs_clarification: bool
    handoff: bool
    requires_confirmation: bool


def apply_decision_policy(
    result: RouterOutput,
    state: SessionState,
    catalog: ScenarioCatalog,
) -> PolicyResult:
    primary = result.scenarios[0] if result.scenarios else None

    if primary is None:
        state.low_confidence_streak += 1
        return PolicyResult(
            primary=None,
            needs_clarification=state.low_confidence_streak < 2,
            handoff=state.low_confidence_streak >= 2,
            requires_confirmation=False,
        )

    if primary.scenario_id in {"SYS_OUT_OF_SCOPE", "SYS_GOODBYE"}:
        state.low_confidence_streak = 0
        return PolicyResult(primary, False, False, False)

    if primary.scenario_id == "SYS_UNCLEAR":
        # SYS_UNCLEAR means clarify, but it is not evidence of a <0.45
        # confidence turn. The handoff rule is specifically two low
        # confidence turns in a row.
        state.low_confidence_streak = 0
        return PolicyResult(
            primary,
            needs_clarification=True,
            handoff=False,
            requires_confirmation=False,
        )

    scenario = catalog.scenarios[primary.scenario_id]
    configured_handoff = scenario.get("handoff")
    always_handoff = bool(
        configured_handoff
        and configured_handoff.get("when") == "always"
    )

    if primary.confidence >= HIGH_CONFIDENCE:
        state.low_confidence_streak = 0
        state.active_scenario_id = primary.scenario_id
        return PolicyResult(
            primary,
            needs_clarification=False,
            handoff=always_handoff,
            requires_confirmation=bool(scenario.get("requires_confirmation")),
        )

    if primary.confidence >= LOW_CONFIDENCE:
        # Medium confidence breaks a low-confidence streak. Clarify,
        # but do not move the conversation closer to operator handoff.
        state.low_confidence_streak = 0
        return PolicyResult(
            primary,
            needs_clarification=True,
            handoff=always_handoff,
            requires_confirmation=False,
        )

    state.low_confidence_streak += 1
    if state.low_confidence_streak >= 2:
        return PolicyResult(primary, False, True, False)

    return PolicyResult(primary, True, False, False)


def build_assistant_text(
    *,
    result: RouterOutput,
    policy: PolicyResult,
    catalog: ScenarioCatalog,
) -> str:
    language = result.language if result.language in {"ru", "kk"} else "ru"

    if policy.handoff:
        if policy.primary and policy.primary.scenario_id in catalog.scenarios:
            scenario = catalog.scenarios[policy.primary.scenario_id]
            opening = scenario.get("responses", {}).get(language, {}).get("opening")
            if opening:
                return opening
        return (
            "Передаю обращение оператору вместе с контекстом."
            if language == "ru"
            else "Өтінішті контекстімен бірге операторға жіберемін."
        )

    if policy.needs_clarification:
        if result.clarification_question:
            return result.clarification_question
        return (
            "Уточните, пожалуйста, что именно вы хотите сделать со страховкой?"
            if language == "ru"
            else "Сақтандыру бойынша нақты не істегіңіз келетінін айтыңызшы."
        )

    if policy.primary is None:
        return (
            "Уточните, пожалуйста, ваш запрос."
            if language == "ru"
            else "Сұрағыңызды нақтылап жіберіңізші."
        )

    if policy.primary.scenario_id in catalog.system_intents:
        system_intent = catalog.system_intents[policy.primary.scenario_id]
        return system_intent["response"][language]

    scenario = catalog.scenarios[policy.primary.scenario_id]
    return scenario["responses"][language]["opening"]
