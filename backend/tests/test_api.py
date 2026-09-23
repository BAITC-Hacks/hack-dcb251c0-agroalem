from types import SimpleNamespace
from fastapi.testclient import TestClient
from backend.app.config import Settings
from backend.app.main import app, get_router, sessions
from backend.app.schemas import GroundedAnswer, RouterOutput


class FakeAnswerClient:
    def __init__(self):
        self.responses = self

    def parse(self, **kwargs):
        return SimpleNamespace(output_parsed=GroundedAnswer(assistant_text="Главное — все ли целы?"))


class FakeRouter:
    def __init__(self, confidence: float = 0.91) -> None:
        self.confidence = confidence
        self.settings = Settings()
        self.client = FakeAnswerClient()

    def route(self, **kwargs):
        return (RouterOutput.model_validate({
            "scenarios": [{"scenario_id": "SC11", "confidence": self.confidence,
                           "reason": "Immediate road accident"}],
            "alternatives": [{"scenario_id": "SC13", "confidence": 0.2}],
            "language": "ru", "slots": {}, "is_continuation": False,
            "clarification_question": "Это ДТП происходит прямо сейчас или вы оформляете ущерб по КАСКО?",
        }), 12.5)


def setup_function() -> None:
    sessions.clear()
    app.dependency_overrides.clear()


def teardown_function() -> None:
    sessions.clear()
    app.dependency_overrides.clear()


def test_text_turn_returns_trace_contract_fields() -> None:
    app.dependency_overrides[get_router] = lambda: FakeRouter()
    client = TestClient(app)
    response = client.post("/v1/turn/text", json={"session_id": "test-1", "text": "Я только что попал в аварию"})
    assert response.status_code == 200
    body = response.json()
    assert body["turn"] == 1
    assert body["trace"]["scenarios"][0]["scenario_id"] == "SC11"
    assert body["trace"]["latency_ms"]["router"] == 12.5  # Explicit provider fixture, not a benchmark.
    assert body["trace"]["latency_ms"]["stt"] is None
    assert body["trace"]["latency_ms"]["tts_first_audio"] is None
    assert body["trace"]["actions"] == []


def test_medium_confidence_returns_clarification() -> None:
    app.dependency_overrides[get_router] = lambda: FakeRouter(confidence=0.6)
    client = TestClient(app)
    response = client.post("/v1/turn/text", json={"session_id": "test-2", "text": "У меня авария"})
    assert response.status_code == 200
    body = response.json()
    assert body["trace"]["needs_clarification"] is True
    assert "?" in body["assistant_text"]
