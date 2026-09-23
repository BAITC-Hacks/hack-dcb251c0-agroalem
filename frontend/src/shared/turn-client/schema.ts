import { z } from "zod";

const scenarioDecisionSchema = z.object({
  scenario_id: z.string().min(1),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

const alternativeDecisionSchema = z.object({
  scenario_id: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

const latencySchema = z.object({
  stt: z.number().nonnegative().nullable(),
  triage: z.number().nonnegative().nullable(),
  router: z.number().nonnegative().nullable(),
  response: z.number().nonnegative().nullable(),
  tts_first_audio: z.number().nonnegative().nullable(),
  total: z.number().nonnegative().nullable(),
});

export const turnResultSchema = z.object({
  session_id: z.string().min(1),
  turn: z.number().int().positive(),
  transcript: z.string(),
  assistant_text: z.string(),
  trace: z.object({
    language: z.enum(["ru", "kk", "mixed", "unknown"]),
    scenarios: z.array(scenarioDecisionSchema),
    alternatives: z.array(alternativeDecisionSchema),
    slots: z.record(z.string(), z.unknown()),
    actions: z.array(z.string()),
    is_continuation: z.boolean(),
    needs_clarification: z.boolean(),
    handoff: z.boolean(),
    requires_confirmation: z.boolean(),
    latency_ms: latencySchema,
  }),
});

export type TurnResult = z.infer<typeof turnResultSchema>;

export type TurnInput = {
  session_id: string;
  text: string;
};
