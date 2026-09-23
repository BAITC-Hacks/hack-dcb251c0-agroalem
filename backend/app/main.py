from __future__ import annotations

from time import perf_counter

from fastapi import Depends, FastAPI, HTTPException

from .catalog import load_catalog
from .decision import apply_decision_policy, build_assistant_text
from .router import LLMRouter, RouterProviderError, RouterTimeout, RouterUnavailable
from .schemas import LatencyTrace, TextTurnRequest, TurnResponse, TurnTrace
from .sessions import SessionStore

app = FastAPI(title="Voice Router Backend")
sessions = SessionStore()


def get_router() -> LLMRouter:
    try:
        return LLMRouter()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Routing provider is not configured",
        ) from exc


@app.get("/health")
def health() -> dict[str, object]:
    catalog = load_catalog()
    return {
        "status": "ok",
        "business_scenarios": len(catalog.scenarios),
        "system_intents": len(catalog.system_intents),
    }


@app.post("/v1/turn/text", response_model=TurnResponse)
def text_turn(
    request: TextTurnRequest,
    router: LLMRouter = Depends(get_router),
) -> TurnResponse:
    total_started = perf_counter()
    catalog = load_catalog()
    state = sessions.get(request.session_id)

    try:
        routed, router_ms = router.route(
            text=request.text,
            history=state.history,
            active_scenario_id=state.active_scenario_id,
        )
    except RouterTimeout as exc:
        raise HTTPException(status_code=504, detail=str(exc)) from exc
    except (RouterProviderError, RouterUnavailable) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    policy = apply_decision_policy(routed, state, catalog)
    response_started = perf_counter()
    assistant_text = build_assistant_text(
        result=routed,
        policy=policy,
        catalog=catalog,
    )
    response_ms = (perf_counter() - response_started) * 1000

    state.turn += 1
    state.append_history(
        {
            "turn": state.turn,
            "user_text": request.text,
            "scenario_ids": [item.scenario_id for item in routed.scenarios],
            "language": routed.language,
        }
    )

    total_ms = (perf_counter() - total_started) * 1000
    return TurnResponse(
        session_id=request.session_id,
        turn=state.turn,
        transcript=request.text,
        assistant_text=assistant_text,
        trace=TurnTrace(
            language=routed.language,
            scenarios=routed.scenarios,
            alternatives=routed.alternatives,
            slots=routed.slots,
            actions=[],
            is_continuation=routed.is_continuation,
            needs_clarification=policy.needs_clarification,
            handoff=policy.handoff,
            requires_confirmation=policy.requires_confirmation,
            latency_ms=LatencyTrace(
                router=router_ms,
                response=response_ms,
                total=total_ms,
            ),
        ),
    )
