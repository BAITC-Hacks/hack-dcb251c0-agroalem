import { describe, expect, it } from "vitest";

import { validTurnPayload } from "../../test/turn-fixture";
import { turnResultSchema } from "./schema";

describe("turnResultSchema", () => {
  it("preserves published voice fields and full-generation TTS without inventing first audio", () => {
    const parsed = turnResultSchema.parse({
      ...validTurnPayload,
      assistant_audio: {
        mime_type: "audio/mpeg",
        base64: "SUQz",
        ai_generated: true,
      },
      audio_error: null,
      trace: {
        ...validTurnPayload.trace,
        latency_ms: { ...validTurnPayload.trace.latency_ms, tts: 812 },
      },
    });
    expect(parsed).toHaveProperty("assistant_audio.base64", "SUQz");
    expect(parsed).toHaveProperty("audio_error", null);
    expect(parsed.trace.latency_ms).toHaveProperty("tts", 812);
    expect(parsed.trace.latency_ms.tts_first_audio).toBeNull();
  });

  it("rejects invalid published voice metadata and negative TTS timing", () => {
    expect(
      turnResultSchema.safeParse({
        ...validTurnPayload,
        assistant_audio: {
          mime_type: "text/html",
          base64: "SUQz",
          ai_generated: false,
        },
      }).success,
    ).toBe(false);
    expect(
      turnResultSchema.safeParse({ ...validTurnPayload, audio_error: 123 })
        .success,
    ).toBe(false);
    expect(
      turnResultSchema.safeParse({
        ...validTurnPayload,
        trace: {
          ...validTurnPayload.trace,
          latency_ms: { ...validTurnPayload.trace.latency_ms, tts: -1 },
        },
      }).success,
    ).toBe(false);
  });
  it("accepts the complete published text response without changing values", () => {
    const parsed = turnResultSchema.parse(validTurnPayload);

    expect(parsed.trace.language).toBe("unknown");
    expect(
      parsed.trace.scenarios.map(({ scenario_id }) => scenario_id),
    ).toEqual(["SC11", "SC13"]);
    expect(parsed.trace.latency_ms.stt).toBeNull();
    expect(parsed.trace.requires_confirmation).toBe(true);
  });

  it("rejects invented language and invalid confidence", () => {
    const parsed = turnResultSchema.safeParse({
      ...validTurnPayload,
      trace: {
        ...validTurnPayload.trace,
        language: "other",
        scenarios: [
          {
            ...validTurnPayload.trace.scenarios[0],
            confidence: 1.2,
          },
        ],
      },
    });

    expect(parsed.success).toBe(false);
  });
});
