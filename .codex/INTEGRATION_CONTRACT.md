# INTEGRATION_CONTRACT.md

This is the shared interface between Tim/backend and Danil/frontend.

It defines domain payloads.
It intentionally does NOT invent HTTP endpoint paths, framework names, or transport details before the repository is inspected.

Tim owns the final backend contract.
Danil consumes it.

If Danil needs a contract change:
1. do not silently change backend assumptions;
2. document the requested change in `.codex/DANIL_TO_TIM.md`;
3. continue with mocks/adapters where possible;
4. Tim accepts/rejects the change and updates this contract.

---

# 1. Turn input

The frontend must be able to submit either:

- microphone audio; or
- text fallback.

Transport details must be derived from the actual stack.

Logical input:

```json
{
  "session_id": "string",
  "input_mode": "voice|text",
  "text": "optional text",
  "audio": "transport-specific when voice"
}
```

Do not hardcode a transport representation until implementation chooses one.

---

# 2. Turn result

The frontend needs a normalized result conceptually containing:

```json
{
  "session_id": "string",
  "turn": 1,
  "transcript": "string",
  "assistant_text": "string",
  "assistant_audio": null,
  "trace": {
    "language": "ru|kk|mixed",
    "scenarios": [
      {
        "scenario_id": "SC01",
        "confidence": 0.9,
        "reason": "short operational reason"
      }
    ],
    "alternatives": [
      {
        "scenario_id": "SC02",
        "confidence": 0.2
      }
    ],
    "slots": {},
    "actions": [],
    "is_continuation": false,
    "needs_clarification": false,
    "handoff": false,
    "latency_ms": {
      "stt": null,
      "triage": null,
      "router": null,
      "response": null,
      "tts_first_audio": null,
      "total": null
    }
  }
}
```

Rules:

- keep official scenario IDs unchanged;
- confidence is numeric;
- missing timing is `null`, never a fake zero unless zero is genuinely measured;
- rationale is concise operational evidence, not hidden chain-of-thought;
- `assistant_audio` representation is implementation-specific and must be documented once chosen;
- additional fields are allowed if they are real and useful.

---

# 3. Clarification

When the decision policy yields `SYS_UNCLEAR`, the backend returns a normal turn result with:

- no invented business scenario execution;
- a short clarification question;
- the two leading alternatives visible in the trace.

Frontend displays it as a normal assistant turn and makes uncertainty visible in the supervisor panel.

---

# 4. Operator handoff

Handoff result must include enough context that the customer does not need to repeat the issue.

Frontend must visibly show handoff state.

Backend owns the summary content and routing queue.

---

# 5. Confirmation

For irreversible actions:

1. backend returns preview state;
2. frontend shows/speaks the proposed action;
3. customer explicitly confirms;
4. confirmation is sent as the next turn;
5. backend executes only after valid confirmation.

Frontend must not invoke irreversible mock actions directly.

---

# 6. Trace UI minimum contract

After every user utterance Danil's UI must be able to render:

- transcript;
- language;
- selected scenario(s);
- confidence;
- reason;
- alternatives;
- slots;
- actions;
- latency:
  - STT
  - triage
  - router
  - response
  - TTS first audio
  - total

If the backend field is unavailable, render unavailable rather than inventing a value.

---

# 7. Contract-change discipline

Any breaking change must:

1. update this file;
2. include a backend commit;
3. include frontend adaptation or an explicit handoff;
4. be mentioned in both relevant state/handoff files;
5. be integration-tested before `main`.
