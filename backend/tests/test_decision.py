from backend.app.catalog import load_catalog
from backend.app.decision import apply_decision_policy
from backend.app.schemas import RouterOutput
from backend.app.sessions import SessionState


def _result(scenario_id: str, confidence: float) -> RouterOutput:
    return RouterOutput.model_validate(
        {
            "scenarios": [
                {
                    "scenario_id": scenario_id,
                    "confidence": confidence,
                    "reason": "test reason",
                }
            ],
            "alternatives": [
                {"scenario_id": "SC13", "confidence": 0.3}
            ],
            "language": "ru",
            "slots": {},
            "is_continuation": False,
            "clarification_question": "Это ДТП сейчас или обращение по КАСКО?",
        }
    )


def test_high_confidence_routes_without_clarification() -> None:
    state = SessionState()
    result = apply_decision_policy(_result("SC11", 0.9), state, load_catalog())
    assert result.needs_clarification is False
    assert result.handoff is False
    assert state.active_scenario_id == "SC11"
    assert state.low_confidence_streak == 0


def test_medium_confidence_clarifies_without_incrementing_low_streak() -> None:
    state = SessionState()
    result = apply_decision_policy(_result("SC11", 0.6), state, load_catalog())
    assert result.needs_clarification is True
    assert result.handoff is False
    assert state.low_confidence_streak == 0


def test_two_low_confidence_turns_handoff() -> None:
    state = SessionState()
    first = apply_decision_policy(_result("SC11", 0.2), state, load_catalog())
    second = apply_decision_policy(_result("SC11", 0.2), state, load_catalog())
    assert first.needs_clarification is True
    assert first.handoff is False
    assert second.handoff is True
    assert state.low_confidence_streak == 2


def test_medium_confidence_breaks_low_confidence_streak() -> None:
    state = SessionState()
    first = apply_decision_policy(_result("SC11", 0.2), state, load_catalog())
    medium = apply_decision_policy(_result("SC11", 0.6), state, load_catalog())
    second_low = apply_decision_policy(_result("SC11", 0.2), state, load_catalog())

    assert first.needs_clarification is True
    assert medium.needs_clarification is True
    assert medium.handoff is False
    assert second_low.needs_clarification is True
    assert second_low.handoff is False
    assert state.low_confidence_streak == 1


def test_high_confidence_breaks_low_confidence_streak() -> None:
    state = SessionState()
    apply_decision_policy(_result("SC11", 0.2), state, load_catalog())
    high = apply_decision_policy(_result("SC11", 0.9), state, load_catalog())
    next_low = apply_decision_policy(_result("SC11", 0.2), state, load_catalog())

    assert high.handoff is False
    assert next_low.needs_clarification is True
    assert next_low.handoff is False
    assert state.low_confidence_streak == 1


def test_sys_unclear_clarifies_without_low_streak() -> None:
    state = SessionState(low_confidence_streak=1)
    result = apply_decision_policy(
        _result("SYS_UNCLEAR", 0.8),
        state,
        load_catalog(),
    )
    assert result.needs_clarification is True
    assert result.handoff is False
    assert state.low_confidence_streak == 0


def test_operator_request_always_handoffs() -> None:
    state = SessionState()
    result = apply_decision_policy(_result("SC37", 0.95), state, load_catalog())
    assert result.handoff is True
