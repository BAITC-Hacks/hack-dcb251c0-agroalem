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
        state.low_confidence_streak += 1
        return PolicyResult(
            primary,
            needs_clarification=state.low_confidence_streak < 2,
            handoff=state.low_confidence_streak >= 2,
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

    state.low_confidence_streak += 1
    if state.low_confidence_streak >= 2:
        return PolicyResult(primary, False, True, False)

    return PolicyResult(primary, True, False, False)


def _scenario_label(scenario_id: str, catalog: ScenarioCatalog) -> str:
    item = catalog.scenarios.get(scenario_id)
    return item.get("name", scenario_id) if item else scenario_id


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
        candidates = []
        if policy.primary and policy.primary.scenario_id in catalog.scenarios:
            candidates.append(policy.primary.scenario_id)
        candidates.extend(
            item.scenario_id
            for item in result.alternatives
            if item.scenario_id in catalog.scenarios
        )
        candidates = list(dict.fromkeys(candidates))[:2]
        if len(candidates) == 2:
            template = catalog.system_intents["SYS_UNCLEAR"]["response"][language]
            return template.format(
                option_a=_scenario_label(candidates[0], catalog),
                option_b=_scenario_label(candidates[1], catalog),
            )
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
