"""Executable contract/runtime tests with explicit unit fixtures, NOT live LLM evaluation."""
from __future__ import annotations

import io
import json
from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.app import main as api
from backend.app.catalog import ScenarioCatalog
from backend.app.config import Settings
from backend.app.decision import apply_decision_policy
from backend.app.openai_client import OpenAIClient, ProviderError, ProviderNotConfigured, ProviderTimeout, strict_schema
from backend.app.responder import answer_from_knowledge
from backend.app.router import LLMRouter
from backend.app.schemas import GroundedAnswer, RouterModelOutput, RouterOutput, TextTurnRequest
from backend.app.sessions import SessionStore


@pytest.fixture
def catalog():
    # Minimal unit fixture. It is never written under starter-kit/ or used for benchmarks.
    scenarios = {
        "SC01": {"scenario_id": "SC01", "name": "OGPO price quote", "description": "quote",
                 "not_this_if": [], "priority": "normal", "requires_confirmation": False,
                 "handoff": None, "slots": {"required": ["region"], "optional": []},
                 "responses": {"ru": {"opening": "Уточните город."}, "kk": {"opening": "Қай қала?"}}},
        "SC02": {"scenario_id": "SC02", "priority": "normal", "requires_confirmation": True,
                 "handoff": None, "slots": {"required": [], "optional": []}},
        "SC37": {"scenario_id": "SC37", "requires_confirmation": False, "slots": {},
                 "handoff": {"when": "always", "queue": "operator_general"}},
    }
    return ScenarioCatalog(scenarios, {
        "SYS_OUT_OF_SCOPE": {"id": "SYS_OUT_OF_SCOPE", "response": {"ru": "Не по теме.", "kk": "Тақырыптан тыс."}},
        "SYS_GOODBYE": {"id": "SYS_GOODBYE", "response": {"ru": "До свидания.", "kk": "Сау болыңыз."}},
        "SYS_UNCLEAR": {"id": "SYS_UNCLEAR", "response": {"ru": "Уточните.", "kk": "Нақтылаңыз."}},
    })


def output(scenario="SC01", confidence=.9, slots=None):
    return RouterOutput(scenarios=[{"scenario_id": scenario, "confidence": confidence, "reason": "unit fixture"}],
                        alternatives=[], language="ru", slots=slots or {}, is_continuation=False,
                        clarification_question="Уточните вопрос?")


class FakeClient:
    def __init__(self):
        self.responses = self
        self.calls = []
        self.fail_answer = False
        self.fail_speech = False
        self.transcript = "Запрос из тестовой аудиозаписи"
    def parse(self, **kwargs):
        self.calls.append(kwargs)
        if self.fail_answer:
            raise ProviderTimeout("OpenAI request timed out")
        return SimpleNamespace(output_parsed=GroundedAnswer(assistant_text="Ответ из unit fixture."))
    def transcribe(self, **kwargs):
        self.calls.append(kwargs)
        return self.transcript
    def synthesize(self, **kwargs):
        self.calls.append(kwargs)
        if self.fail_speech:
            raise ProviderError("Speech unavailable")
        return b"ID3-unit-test-audio-not-real-speech"


class FakeRouter:
    def __init__(self):
        self.settings = Settings()
        self.client = FakeClient()
        self.result = output()
        self.histories = []
    def route(self, **kwargs):
        self.histories.append(json.loads(json.dumps(kwargs)))
        return self.result, 1.5


@pytest.fixture
def runtime(catalog, monkeypatch):
    api.sessions.clear()
    monkeypatch.setattr(api, "load_catalog", lambda: catalog)
    # Grounding is still exercised; the knowledge document is explicitly a fixture.
    from backend.app import responder
    monkeypatch.setattr(responder, "load_knowledge", lambda: {"unit_test_only": True})
    router = FakeRouter()
    api.app.dependency_overrides[api.get_router] = lambda: router
    with TestClient(api.app) as client:
        yield client, router
    api.app.dependency_overrides.clear()
    api.sessions.clear()


def post(client, text="Тест", session="session-unit"):
    return client.post("/v1/turn/text", json={"session_id": session, "text": text})


def test_text_flow_and_grounding_payload(runtime):
    client, router = runtime
    result = post(client).json()
    assert result["assistant_text"] == "Ответ из unit fixture."
    assert result["trace"]["actions"] == []
    assert result["trace"]["latency_ms"]["stt"] is None
    assert result["trace"]["latency_ms"]["tts_first_audio"] is None
    request = router.client.calls[0]
    payload = json.loads(request["input"])
    assert payload["knowledge_base"] == {"unit_test_only": True}
    assert payload["executed_actions"] == []
    assert "No actions have executed" in request["instructions"]


def test_history_includes_assistant_and_slots(runtime):
    client, router = runtime
    router.result = output(slots={"region": "astana", "invented_slot": "reject"})
    assert post(client, "Первый вопрос").status_code == 200
    assert post(client, "А это?").status_code == 200
    previous = router.histories[-1]["history"][0]
    assert previous["assistant_text"] == "Ответ из unit fixture."
    assert previous["slots"] == {"region": "astana"}
    assert router.histories[-1]["active_scenario_id"] == "SC01"


def test_turn_failure_rolls_back_state(runtime):
    client, router = runtime
    post(client)
    router.client.fail_answer = True
    assert post(client).status_code == 504
    state = api.sessions.get("session-unit")
    assert state.turn == 1 and len(state.history) == 1


def test_10_turn_limit_and_isolation(runtime):
    client, router = runtime
    for _ in range(12):
        assert post(client).status_code == 200
    assert len(api.sessions.get("session-unit").history) == 10
    assert post(client, session="another").json()["turn"] == 1


@pytest.mark.parametrize("field,value", [("text", "   "), ("text", "x" * 4001), ("session_id", " \n ")])
def test_request_validation(runtime, field, value):
    client, router = runtime
    body = {"session_id": "unit", "text": "query", field: value}
    assert client.post("/v1/turn/text", json=body).status_code == 422
    assert not router.histories


def test_request_trim(runtime):
    client, _ = runtime
    response = client.post("/v1/turn/text", json={"session_id": " unit ", "text": " query "}).json()
    assert response["session_id"] == "unit" and response["transcript"] == "query"


@pytest.mark.parametrize("score,clarify,handoff", [(.44, True, False), (.45, True, False), (.749, True, False), (.75, False, False)])
def test_policy_boundaries(catalog, score, clarify, handoff):
    from backend.app.sessions import SessionState
    state = SessionState()
    decision = apply_decision_policy(output(confidence=score), state, catalog)
    assert decision.needs_clarification is clarify and decision.handoff is handoff


def test_low_medium_low_does_not_handoff(catalog):
    from backend.app.sessions import SessionState
    state = SessionState()
    for score in (.2, .6, .2):
        decision = apply_decision_policy(output(confidence=score), state, catalog)
        assert not decision.handoff
    assert state.low_confidence_streak == 1


def test_handoff_does_not_claim_transfer(runtime):
    client, router = runtime
    router.result = output("SC37")
    body = post(client).json()
    assert body["trace"]["handoff"] and not body["trace"]["needs_clarification"]
    assert "не подключено" in body["assistant_text"]
    assert not router.client.calls


def test_confirmation_flag_is_not_execution(runtime):
    client, router = runtime
    router.result = output("SC02")
    body = post(client, "Да, оформляйте").json()
    assert body["trace"]["requires_confirmation"]
    assert body["trace"]["actions"] == []


def test_unknown_ids_become_502(runtime):
    client, router = runtime
    router.result = output("SC999")
    assert post(client).status_code == 502
    assert api.sessions.get("session-unit").turn == 0


def test_transcription_route(runtime):
    client, router = runtime
    result = client.post("/v1/audio/transcriptions", files={"file": ("clip.webm", b"unit-bytes", "audio/webm;codecs=opus")})
    assert result.status_code == 200
    assert result.json()["text"] == router.client.transcript
    assert router.client.calls[0]["filename"] == "recording.webm"
    assert api.sessions.get("session-unit").turn == 0


@pytest.mark.parametrize("mime,data,expected", [("application/octet-stream", b"x", 415), ("audio/ogg", b"x", 415), ("audio/webm", b"", 422)])
def test_audio_validation_before_provider(runtime, mime, data, expected):
    client, router = runtime
    result = client.post("/v1/audio/transcriptions", files={"file": ("../../unsafe", data, mime)})
    assert result.status_code == expected and not router.client.calls


def test_large_audio_rejected(runtime):
    client, router = runtime
    result = client.post("/v1/audio/transcriptions", files={"file": ("audio.webm", b"x" * (20 * 1024 * 1024 + 1), "audio/webm")})
    assert result.status_code == 413 and not router.client.calls


def test_speech_route_has_binary_and_disclosure(runtime):
    client, _ = runtime
    response = client.post("/v1/audio/speech", json={"text": "Тестовый ответ"})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("audio/mpeg")
    assert response.headers["x-audio-generated-by"] == "AI"
    assert response.headers["cache-control"] == "no-store"
    assert response.content.startswith(b"ID3")


@pytest.mark.parametrize("text", [" ", "x" * 2001])
def test_speech_request_limit(runtime, text):
    client, router = runtime
    assert client.post("/v1/audio/speech", json={"text": text}).status_code == 422
    assert not router.client.calls


def test_combined_audio_pipeline(runtime):
    client, router = runtime
    result = client.post("/v1/turn/audio", data={"session_id": "unit-audio"},
                         files={"file": ("clip.webm", b"unit-bytes", "audio/webm")})
    assert result.status_code == 200
    body = result.json()
    assert body["transcript"] == router.client.transcript
    assert body["assistant_audio"]["ai_generated"] is True
    assert body["assistant_audio"]["mime_type"] == "audio/mpeg"
    assert body["trace"]["latency_ms"]["stt"] >= 0
    assert body["trace"]["latency_ms"]["tts"] >= 0
    assert body["trace"]["latency_ms"]["tts_first_audio"] is None


def test_tts_failure_does_not_erase_text(runtime):
    client, router = runtime
    router.client.fail_speech = True
    response = client.post("/v1/turn/audio", data={"session_id": "unit-audio"},
                           files={"file": ("clip.webm", b"unit-bytes", "audio/webm")})
    body = response.json()
    assert response.status_code == 200 and body["assistant_text"]
    assert body["assistant_audio"] is None and body["audio_error"] == "provider_error"
    assert api.sessions.get("unit-audio").turn == 1


def test_audio_can_omit_speech(runtime):
    client, router = runtime
    response = client.post("/v1/turn/audio", data={"session_id": "unit", "include_audio": "false"},
                           files={"file": ("clip.mp4", b"unit-bytes", "audio/mp4")})
    assert response.status_code == 200
    assert response.json()["assistant_audio"] is None
    assert not any("voice" in call for call in router.client.calls)


def test_jury_page_and_script(runtime):
    client, _ = runtime
    page = client.get("/")
    assert page.status_code == 200
    assert "Озвучка создана ИИ" in page.text
    assert "script-src 'self'" in page.headers["content-security-policy"]
    assert client.get("/app.js").status_code == 200
    assert client.get("/style.css").status_code == 200


def test_health_never_leaks_key(runtime, monkeypatch):
    client, _ = runtime
    monkeypatch.setenv("OPENAI_API_KEY", "unit-secret-not-real")
    response = client.get("/health")
    assert response.json()["provider_configured"] is True
    assert "unit-secret-not-real" not in response.text
    assert "unit-secret-not-real" not in client.get("/v1/config").text


def test_session_serialization_and_rollback():
    store = SessionStore()
    def increment(_):
        with store.transaction("shared") as state:
            state.turn += 1
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(increment, range(20)))
    assert store.get("shared").turn == 20
    with pytest.raises(ValueError):
        with store.transaction("shared") as state:
            state.turn += 1
            raise ValueError("rollback")
    assert store.get("shared").turn == 20


def test_session_store_is_bounded():
    store = SessionStore(max_sessions=2)
    for name in ("a", "b", "c"):
        with store.transaction(name) as state:
            state.turn += 1
    assert len(store._states) == 2


def make_http(handler):
    return OpenAIClient(api_key="unit-test-key-not-real", transport=httpx.MockTransport(handler))


def structured_body(payload):
    return {"status": "completed", "output": [{"type": "message", "content": [{"type": "output_text", "text": json.dumps(payload)}]}]}


def test_real_http_adapter_builds_official_responses_payload():
    def handler(request):
        assert str(request.url) == "https://api.openai.com/v1/responses"
        assert request.headers["authorization"] == "Bearer unit-test-key-not-real"
        body = json.loads(request.content)
        assert body["store"] is False
        assert body["text"]["format"]["strict"] is True
        assert body["text"]["format"]["schema"]["additionalProperties"] is False
        return httpx.Response(200, json=structured_body({"assistant_text": "unit answer"}))
    client = make_http(handler)
    try:
        result = client.parse(model="unit-model", instructions="unit", input="unit", text_format=GroundedAnswer)
        assert result.output_parsed.assistant_text == "unit answer"
    finally:
        client.close()


@pytest.mark.parametrize("body", [{"status": "incomplete"}, {"status": "completed", "output": []},
                                   {"status": "completed", "output": [{"content": [{"type": "refusal"}]}]},
                                   structured_body({"not_the_field": "unit"})])
def test_provider_invalid_output_is_never_success(body):
    client = make_http(lambda request: httpx.Response(200, json=body))
    try:
        with pytest.raises(ProviderError):
            client.parse(model="unit", instructions="unit", input="unit", text_format=GroundedAnswer)
    finally:
        client.close()


@pytest.mark.parametrize("status,error", [(401, ProviderNotConfigured), (403, ProviderNotConfigured), (429, ProviderError), (500, ProviderError), (302, ProviderError)])
def test_http_errors_are_sanitized(status, error):
    client = make_http(lambda request: httpx.Response(status, json={"error": "SECRET"}))
    try:
        with pytest.raises(error) as caught:
            client.synthesize(model="unit", text="unit", voice="coral")
        assert "SECRET" not in str(caught.value)
    finally:
        client.close()


def test_timeout_mapping():
    def handler(request):
        raise httpx.ReadTimeout("raw SECRET", request=request)
    client = make_http(handler)
    try:
        with pytest.raises(ProviderTimeout) as caught:
            client.synthesize(model="unit", text="unit", voice="coral")
        assert "SECRET" not in str(caught.value)
    finally:
        client.close()


def test_missing_key_fails_before_network(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    with pytest.raises(ProviderNotConfigured):
        OpenAIClient()


def test_audio_http_payloads():
    calls = []
    def handler(request):
        calls.append(request)
        if request.url.path.endswith("transcriptions"):
            assert "multipart/form-data" in request.headers["content-type"]
            assert b'filename="recording.webm"' in request.content
            assert b"gpt-4o-mini-transcribe" in request.content
            return httpx.Response(200, json={"text": "  Тест  "})
        body = json.loads(request.content)
        assert body == {"model": "gpt-4o-mini-tts", "input": "Тест", "voice": "coral", "response_format": "mp3"}
        return httpx.Response(200, content=b"ID3-unit", headers={"Content-Type": "audio/mpeg"})
    client = make_http(handler)
    try:
        text = client.transcribe(model="gpt-4o-mini-transcribe", audio=b"unit", filename="recording.webm", mime="audio/webm")
        assert text == "Тест"
        assert client.synthesize(model="gpt-4o-mini-tts", text=text, voice="coral") == b"ID3-unit"
        assert len(calls) == 2
    finally:
        client.close()


def test_router_uses_injected_catalog_and_real_rest_parser(catalog):
    def handler(request):
        payload = {"scenarios": [{"scenario_id": "SC01", "confidence": .9, "reason": "unit"}],
                   "alternatives": [], "language": "ru", "slots": [{"name": "region", "value": "astana"}],
                   "is_continuation": False, "clarification_question": None}
        return httpx.Response(200, json=structured_body(payload))
    client = make_http(handler)
    try:
        result, measured = LLMRouter(client=client, catalog=catalog).route(text="unit")
        assert result.slots == {"region": "astana"} and measured >= 0
    finally:
        client.close()


def test_schema_requires_all_output_fields():
    schema = strict_schema(RouterModelOutput)
    assert set(schema["required"]) == set(schema["properties"])
    for sub in schema.get("$defs", {}).values():
        if sub.get("type") == "object":
            assert sub["additionalProperties"] is False
            assert set(sub["required"]) == set(sub["properties"])
