from backend.app.evaluation import generate_predictions, prediction_ids
from backend.app.schemas import RouterOutput


def _result(scenario_ids: list[tuple[str, float]]) -> RouterOutput:
    return RouterOutput.model_validate(
        {
            "scenarios": [
                {
                    "scenario_id": scenario_id,
                    "confidence": confidence,
                    "reason": "test",
                }
                for scenario_id, confidence in scenario_ids
            ],
            "alternatives": [],
            "language": "ru",
            "slots": {},
            "is_continuation": False,
            "clarification_question": None,
        }
    )


def test_prediction_ids_preserve_high_confidence_multi_intent_order() -> None:
    result = _result([("SC27", 0.91), ("SC04", 0.82)])
    assert prediction_ids(result) == ["SC27", "SC04"]


def test_prediction_ids_map_uncertain_business_route_to_sys_unclear() -> None:
    result = _result([("SC11", 0.61)])
    assert prediction_ids(result) == ["SYS_UNCLEAR"]


def test_prediction_ids_keep_system_intent() -> None:
    result = _result([("SYS_OUT_OF_SCOPE", 0.93)])
    assert prediction_ids(result) == ["SYS_OUT_OF_SCOPE"]


class FakeRouter:
    def route(self, *, text, history=None, active_scenario_id=None):
        if "оператор" in text:
            return _result([("SC37", 0.95)]), 1.0
        return _result([("SC01", 0.90)]), 1.0


def test_generate_predictions_uses_official_ids() -> None:
    utterances = [
        {"id": "U1", "text": "Сколько стоит ОГПО?"},
        {"id": "U2", "text": "Соедините с оператором"},
    ]
    assert generate_predictions(FakeRouter(), utterances) == {
        "U1": ["SC01"],
        "U2": ["SC37"],
    }
