"""Deterministic policy fixtures, not real routing or dataset evaluation."""
import pytest
from backend.app.catalog import ScenarioCatalog
from backend.app.decision import apply_decision_policy, build_assistant_text
from backend.app.schemas import RouterOutput
from backend.app.sessions import SessionState

@pytest.fixture
def catalog():
    return ScenarioCatalog(scenarios={
        "SC11": {"handoff": {"when": "anyone injured or client is confused"},
            "requires_confirmation": False, "responses": {"ru": {"opening": "Unit business opening"}}},
        "SC37": {"handoff": {"when": "always"}, "requires_confirmation": False},
    }, system_intents={"SYS_UNCLEAR": {}, "SYS_OUT_OF_SCOPE": {}, "SYS_GOODBYE": {}})


def routed(score, identifier="SC11", language="ru"):
    return RouterOutput(language=language, scenarios=[{
        "scenario_id": identifier, "confidence": score, "reason": "unit fixture",
    }])

@pytest.mark.parametrize("scores,streak,handoff", [
    ([0.2, 0.2], 2, True),
    ([0.2, 0.6, 0.2], 1, False),
    ([0.2, 0.9, 0.2], 1, False),
    ([0.4499], 1, False),
    ([0.45], 0, False),
    ([0.7499], 0, False),
    ([0.75], 0, False),
    ([0.2, 0.45, 0.2], 1, False),
])
def test_consecutive_low_confidence_boundaries(catalog, scores, streak, handoff):
    state = SessionState()
    for score in scores:
        policy = apply_decision_policy(routed(score), state, catalog)
    assert state.low_confidence_streak == streak
    assert policy.handoff == handoff

@pytest.mark.parametrize("score", [0.45, 0.6, 0.95])
def test_operator_handoff_is_not_also_a_clarification(catalog, score):
    policy = apply_decision_policy(routed(score, "SC37"), SessionState(), catalog)
    assert policy.handoff
    assert not policy.needs_clarification

@pytest.mark.parametrize("language", ["ru", "kk", "mixed"])
def test_handoff_does_not_claim_execution_or_use_business_opening(catalog, language):
    state = SessionState()
    result = routed(0.2, language=language)
    apply_decision_policy(result, state, catalog)
    policy = apply_decision_policy(result, state, catalog)
    text = build_assistant_text(result=result, policy=policy, catalog=catalog)
    assert "демо" in text
    assert "Unit business opening" not in text


def test_sys_unclear_resets_low_streak(catalog):
    state = SessionState(low_confidence_streak=1)
    policy = apply_decision_policy(routed(0.8, "SYS_UNCLEAR"), state, catalog)
    assert state.low_confidence_streak == 0
    assert policy.needs_clarification and not policy.handoff
