from __future__ import annotations

import base64
import os
from pathlib import Path
from time import perf_counter
from typing import Annotated, Iterator

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response

from .audio import AUDIO_TYPES, MAX_AUDIO_BYTES, read_audio, synthesize
from .catalog import load_catalog
from .config import load_local_environment, load_settings
from .decision import apply_decision_policy, build_assistant_text
from .openai_client import ProviderError
from .responder import answer_from_knowledge
from .router import LLMRouter
from .router_validation import validate_router_output
from .schemas import AssistantAudio, LatencyTrace, SpeechRequest, TextTurnRequest, TurnResponse, TurnTrace
from .sessions import SessionCapacityError, SessionStore

WEB = Path(__file__).resolve().parents[1] / "web"
load_local_environment()
app = FastAPI(title="Voice Router", version="0.2.0", description="Synthetic Saqta contact-center demo")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[s.strip() for s in os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",") if s.strip()],
    allow_credentials=False, allow_methods=["GET", "POST"], allow_headers=["Content-Type"],
)
sessions = SessionStore()


@app.middleware("http")
async def limits_and_headers(request: Request, call_next):
    length = request.headers.get("content-length")
    if length is not None:
        try:
            if int(length) < 0 or int(length) > MAX_AUDIO_BYTES + 1024 * 1024:
                return JSONResponse({"detail": "Request body exceeds the demo limit"}, status_code=413)
        except ValueError:
            return JSONResponse({"detail": "Invalid Content-Length"}, status_code=400)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Cache-Control"] = "no-store"
    if request.url.path in {"/", "/app.js", "/style.css"}:
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self'; style-src 'self'; "
            "connect-src 'self'; media-src 'self' blob: data:; object-src 'none'; "
            "base-uri 'none'; frame-ancestors 'none'"
        )
    return response


@app.exception_handler(ProviderError)
async def provider_error_handler(request: Request, exc: ProviderError):
    return JSONResponse({"detail": str(exc), "code": exc.code}, status_code=exc.status_code)


@app.exception_handler(SessionCapacityError)
async def capacity_error_handler(request: Request, exc: SessionCapacityError):
    return JSONResponse({"detail": "Demo is busy; retry later"}, status_code=429)


def get_router() -> Iterator[LLMRouter]:
    router = LLMRouter()
    try:
        yield router
    finally:
        router.close()


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(WEB / "index.html", media_type="text/html")


@app.get("/app.js", include_in_schema=False)
def javascript():
    return FileResponse(WEB / "app.js", media_type="text/javascript")


@app.get("/style.css", include_in_schema=False)
def stylesheet():
    return FileResponse(WEB / "style.css", media_type="text/css")


@app.get("/health")
def health() -> dict[str, object]:
    try:
        catalog = load_catalog()
    except (OSError, ValueError):
        raise HTTPException(503, "Official starter-kit files are missing or invalid")
    return {"status": "ok", "business_scenarios": len(catalog.scenarios),
            "system_intents": len(catalog.system_intents),
            "provider_configured": bool(os.getenv("OPENAI_API_KEY", "").strip()),
            "provider_live_verified": False, "execution_mode": "read_only_demo"}


@app.get("/v1/config")
def public_config() -> dict[str, object]:
    settings = load_settings()
    return {"text_endpoint": "/v1/turn/text", "audio_endpoint": "/v1/turn/audio",
            "transcription_endpoint": "/v1/audio/transcriptions", "speech_endpoint": "/v1/audio/speech",
            "max_audio_bytes": MAX_AUDIO_BYTES, "accepted_audio_types": list(AUDIO_TYPES),
            "tts_ai_generated": True, "execution_mode": "read_only_demo",
            "models": {"router": settings.router_model, "response": settings.response_model,
                       "stt": settings.stt_model, "tts": settings.tts_model}}


def process_text(request: TextTurnRequest, router: LLMRouter) -> TurnResponse:
    started = perf_counter()
    catalog = load_catalog()
    with sessions.transaction(request.session_id) as state:
        routed, router_ms = router.route(text=request.text, history=state.history,
                                         active_scenario_id=state.active_scenario_id)
        try:
            validate_router_output(routed, catalog)
        except ValueError as exc:
            raise ProviderError("Router returned unknown scenario identifiers") from exc
        policy = apply_decision_policy(routed, state, catalog)
        response_started = perf_counter()
        # Only accepted business scenarios may reach the knowledge-answer layer.
        accepted = (policy.primary is not None and policy.primary.scenario_id in catalog.scenarios
                    and not policy.needs_clarification and not policy.handoff)
        current_slots = dict(routed.slots)
        if accepted:
            scenario_id = policy.primary.scenario_id
            current_slots = state.scenario_slots.setdefault(scenario_id, {})
            # Do not make model-invented slot names part of persisted domain state.
            permitted_slots = set()
            for choice in routed.scenarios:
                scenario = catalog.scenarios.get(choice.scenario_id, {})
                permitted_slots.update(scenario.get("slots", {}).get("required", []))
                permitted_slots.update(scenario.get("slots", {}).get("optional", []))
            current_slots.update({k: v for k, v in routed.slots.items() if k in permitted_slots})
            answer = answer_from_knowledge(
                client=router.client, model=router.settings.response_model, text=request.text,
                scenarios=[catalog.scenarios[item.scenario_id] for item in routed.scenarios
                           if item.scenario_id in catalog.scenarios and item.confidence >= 0.75],
                history=state.history, slots=current_slots, language=routed.language,
            )
        else:
            answer = build_assistant_text(result=routed, policy=policy, catalog=catalog)
        response_ms = (perf_counter() - response_started) * 1000
        state.turn += 1
        state.append_history({"turn": state.turn, "user_text": request.text, "assistant_text": answer,
                              "scenario_ids": [item.scenario_id for item in routed.scenarios],
                              "slots": dict(current_slots), "language": routed.language})
        result = TurnResponse(
            session_id=request.session_id, turn=state.turn, transcript=request.text, assistant_text=answer,
            trace=TurnTrace(language=routed.language, scenarios=routed.scenarios,
                            alternatives=routed.alternatives, slots=dict(current_slots), actions=[],
                            is_continuation=routed.is_continuation,
                            needs_clarification=policy.needs_clarification, handoff=policy.handoff,
                            requires_confirmation=policy.requires_confirmation,
                            latency_ms=LatencyTrace(router=router_ms, response=response_ms,
                                                    total=(perf_counter() - started) * 1000)),
        )
    return result


@app.post("/v1/turn/text", response_model=TurnResponse)
def text_turn(request: TextTurnRequest, router: LLMRouter = Depends(get_router)) -> TurnResponse:
    return process_text(request, router)


@app.post("/v1/audio/transcriptions")
def transcription(file: UploadFile = File(...), router: LLMRouter = Depends(get_router)):
    try:
        content, filename, mime = read_audio(file)
    finally:
        file.file.close()
    started = perf_counter()
    text = router.client.transcribe(model=router.settings.stt_model, audio=content, filename=filename, mime=mime)
    if not text.strip() or len(text.strip()) > 4000:
        raise HTTPException(422, "Transcript is empty or exceeds 4000 characters")
    return {"text": text.strip(), "latency_ms": (perf_counter() - started) * 1000}


@app.post("/v1/audio/speech")
def speech(request: SpeechRequest, router: LLMRouter = Depends(get_router)):
    content, elapsed = synthesize(client=router.client, settings=router.settings, text=request.text)
    return Response(content, media_type="audio/mpeg",
                    headers={"X-TTS-Duration-Ms": f"{elapsed:.3f}", "X-Audio-Generated-By": "AI"})


@app.post("/v1/turn/audio", response_model=TurnResponse)
def audio_turn(session_id: Annotated[str, Form(min_length=1, max_length=128)],
               file: UploadFile = File(...), include_audio: bool = Form(True),
               router: LLMRouter = Depends(get_router)) -> TurnResponse:
    started = perf_counter()
    session_id = session_id.strip()
    if not session_id:
        raise HTTPException(422, "session_id cannot be blank")
    try:
        content, filename, mime = read_audio(file)
    finally:
        file.file.close()
    stt_started = perf_counter()
    text = router.client.transcribe(model=router.settings.stt_model, audio=content, filename=filename, mime=mime)
    if not text.strip() or len(text.strip()) > 4000:
        raise HTTPException(422, "Transcript is empty or exceeds 4000 characters")
    stt_ms = (perf_counter() - stt_started) * 1000
    result = process_text(TextTurnRequest(session_id=session_id, text=text), router)
    result.trace.latency_ms.stt = stt_ms
    if include_audio:
        try:
            content, tts_ms = synthesize(client=router.client, settings=router.settings,
                                          text=result.assistant_text)
            result.assistant_audio = AssistantAudio(base64=base64.b64encode(content).decode("ascii"))
            result.trace.latency_ms.tts = tts_ms
        except ProviderError as exc:
            # The text turn is already complete. Do not rerun routing to retry speech.
            result.audio_error = exc.code
    result.trace.latency_ms.total = (perf_counter() - started) * 1000
    # Batch generation has no client first-audio measurement.
    result.trace.latency_ms.tts_first_audio = None
    return result
