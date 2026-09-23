import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import type { TurnClient } from "../shared/turn-client/client";
import type { TurnResult } from "../shared/turn-client/schema";

const result: TurnResult = {
  session_id: "test-session",
  turn: 1,
  transcript: "Я только что попал в ДТП",
  assistant_text: "Главное — все ли целы?",
  trace: {
    language: "ru",
    scenarios: [
      {
        scenario_id: "SC11",
        confidence: 0.91,
        reason: "Immediate road accident",
      },
    ],
    alternatives: [{ scenario_id: "SC13", confidence: 0.2 }],
    slots: {},
    actions: [],
    is_continuation: false,
    needs_clarification: false,
    handoff: false,
    requires_confirmation: false,
    latency_ms: {
      stt: null,
      triage: null,
      router: 120,
      response: 2,
      tts_first_audio: null,
      total: 122,
    },
  },
};

class FakeClient implements TurnClient {
  async submit() {
    return result;
  }
}

describe("App", () => {
  it("submits text and renders assistant response with real trace fields", async () => {
    const user = userEvent.setup();
    render(<App client={new FakeClient()} />);

    await user.type(
      screen.getByLabelText("Сообщение клиента"),
      "Я только что попал в ДТП",
    );
    await user.click(screen.getByRole("button", { name: "Отправить" }));

    expect(await screen.findByText("Главное — все ли целы?")).toBeInTheDocument();
    expect(screen.getByText("SC11")).toBeInTheDocument();
    expect(screen.getByText("91%")).toBeInTheDocument();
    expect(screen.getByText("120 ms")).toBeInTheDocument();
    expect(screen.getByText("TTS first audio")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});
