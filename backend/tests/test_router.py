from types import SimpleNamespace

from backend.app.config import Settings
from backend.app.router import LLMRouter
from backend.app.schemas import RouterModelOutput


class FakeResponses:
    def parse(self, **kwargs):
        assert kwargs["model"] == "test-model"
        assert kwargs["text_format"] is RouterModelOutput
        assert "OFFICIAL_SCENARIO_CATALOG" in kwargs["input"]
        return SimpleNamespace(
            output_parsed=RouterModelOutput.model_validate(
                {
                    "scenarios": [
                        {
                            "scenario_id": "SC11",
                            "confidence": 0.91,
                            "reason": "Accident is happening now",
                        }
                    ],
                    "alternatives": [
                        {"scenario_id": "SC13", "confidence": 0.2}
                    ],
                    "language": "ru",
                    "slots": [{"name": "location", "value": "Алматы"}],
                    "is_continuation": False,
                    "clarification_question": None,
                }
            )
        )


class FakeClient:
    responses = FakeResponses()


def test_router_parses_and_normalizes_structured_output() -> None:
    router = LLMRouter(
        client=FakeClient(),
        settings=Settings(router_model="test-model"),
    )
    result, latency_ms = router.route(text="Я только что попал в ДТП")
    assert result.scenarios[0].scenario_id == "SC11"
    assert result.slots == {"location": "Алматы"}
    assert latency_ms >= 0
