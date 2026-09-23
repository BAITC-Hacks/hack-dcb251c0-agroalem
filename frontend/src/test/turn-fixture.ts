export const validTurnPayload = {
  session_id: "session-1",
  turn: 1,
  transcript: "Статус заявки",
  assistant_text: "Проверяю статус.",
  trace: {
    language: "unknown" as const,
    scenarios: [
      {
        scenario_id: "SC11",
        confidence: 0.91,
        reason: "Совпали признаки статуса заявки",
      },
      {
        scenario_id: "SC13",
        confidence: 0.67,
        reason: "Есть дополнительный вопрос",
      },
    ],
    alternatives: [{ scenario_id: "SC12", confidence: 0.2 }],
    slots: { policy_number: "P-42" },
    actions: [],
    is_continuation: false,
    needs_clarification: false,
    handoff: false,
    requires_confirmation: true,
    latency_ms: {
      stt: null,
      triage: null,
      router: 123.4,
      response: 0.3,
      tts_first_audio: null,
      total: 124.1,
    },
  },
};
