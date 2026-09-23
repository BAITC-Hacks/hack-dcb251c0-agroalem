import pytest

from backend.app.router_validation import validate_router_output
from backend.app.schemas import RouterOutput


def test_accepts_known_scenario_ids() -> None:
    result = RouterOutput.model_validate(
        {
            "scenarios": [
                {
                    "scenario_id": "SC11",
                    "confidence": 0.91,
                    "reason": "Immediate road accident",
                }
            ],
            "alternatives": [],
            "language": "ru",
            "slots": {},
            "is_continuation": False,
        }
    )
    assert validate_router_output(result) is result


def test_rejects_unknown_scenario_ids() -> None:
    result = RouterOutput.model_validate(
        {
            "scenarios": [
                {
                    "scenario_id": "SC999",
                    "confidence": 0.91,
                    "reason": "Invalid id",
                }
            ],
            "alternatives": [],
            "language": "ru",
            "slots": {},
            "is_continuation": False,
        }
    )
    with pytest.raises(ValueError, match="unknown scenario IDs"):
        validate_router_output(result)
