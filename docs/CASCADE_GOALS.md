# Cascade goals

## Shared critical path
1. Text input.
2. Real LLM router.
3. Correct scenario decision.
4. Trace.
5. Text response.
6. Microphone + STT through same routing pipeline.
7. TTS/playback.
8. Context/state, multi-intent, handoff and confirmation hard cases.
9. Evaluation and reproducibility.
10. Real latency instrumentation.
11. Polish.

Do not optimize voice polish before text routing is correct and observable.

## Tim phases
0. Audit real local repository/starter kit/environment.
1. Confirm shared domain/API contract from real code.
2. Implement/verify LLM router.
3. Dialogue state + executor.
4. Voice server path / STT-TTS adapters.
5. Evaluation + latency.
6. Frontend integration and stable main.

## Danil phases
0. Audit real frontend/environment.
1. Customer + supervisor shells.
2. Verified backend contract adapter.
3. Microphone.
4. Voice playback.
5. Supervisor trace.
6. Clarification/handoff/confirmation UX.
7. Frontend tests.
8. Handoff to Tim for integration.
