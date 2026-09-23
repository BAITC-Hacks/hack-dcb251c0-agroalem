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


def test_medium_confidence_clarifies() -> None:
    state = SessionState()
    result = apply_decision_policy(_result("SC11", 0.6), state, load_catalog())
    assert result.needs_clarification is True
    assert result.handoff is False


def test_two_low_confidence_turns_handoff() -> None:
    state = SessionState()
    first = apply_decision_policy(_result("SC11", 0.2), state, load_catalog())
    second = apply_decision_policy(_result("SC11", 0.2), state, load_catalog())
    assert first.needs_clarification is True
    assert second.handoff is True


def test_operator_request_always_handoffs() -> None:
    state = SessionState()
    result = apply_decision_policy(_result("SC37", 0.95), state, load_catalog())
    assert result.handoff is True
