import { describe, expect, it } from "vitest";

import { validTurnPayload } from "../../test/turn-fixture";
import { turnResultSchema } from "./schema";

describe("turnResultSchema", () => {
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
