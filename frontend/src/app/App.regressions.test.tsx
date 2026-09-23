import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { TurnClientError, type TurnClient } from "../shared/turn-client/client";
import type { TurnInput, TurnResult } from "../shared/turn-client/schema";

function fixture(input: TurnInput): TurnResult {
  return {
    session_id: input.session_id,
    turn: 1,
    transcript: input.text,
    assistant_text: "Тестовый ответ, не живой LLM.",
    trace: {
      language: "ru",
      scenarios: [{ scenario_id: "SC11", confidence: 0.9, reason: "fixture" }],
      alternatives: [],
      slots: { location: "fixture location" },
      actions: [],
      is_continuation: false,
      needs_clarification: false,
      handoff: false,
      requires_confirmation: false,
      latency_ms: {
        stt: null,
        triage: null,
        router: 1,
        response: 1,
        tts_first_audio: null,
        total: 2,
      },
    },
  };
}

async function send(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(screen.getByLabelText("Сообщение клиента"), text);
  await user.click(screen.getByRole("button", { name: "Отправить" }));
}

function firstSuccessThenFailure(): TurnClient {
  return {
    submit: vi
      .fn()
      .mockImplementationOnce(async (input: TurnInput) => fixture(input))
      .mockRejectedValueOnce(new TurnClientError("Unit network failure")),
  };
}

describe("trace ownership", () => {
  it("does not display a previous successful trace for a failed turn", async () => {
    const user = userEvent.setup();
    render(<App client={firstSuccessThenFailure()} />);
    await send(user, "first fixture");
    await screen.findByText("Тестовый ответ, не живой LLM.");
    await send(user, "second fixture");
    await screen.findByRole("alert");
    const panel = within(
      screen.getByRole("region", { name: "Supervisor trace" }),
    );
    expect(panel.queryByText("SC11")).not.toBeInTheDocument();
    expect(
      panel.getByText("Trace этой реплики недоступен"),
    ).toBeInTheDocument();
  });

  it("keeps historical trace accessible through explicit selection", async () => {
    const user = userEvent.setup();
    render(<App client={firstSuccessThenFailure()} />);
    await send(user, "first fixture");
    await screen.findByText("Тестовый ответ, не живой LLM.");
    await send(user, "second fixture");
    await screen.findByRole("alert");
    await user.click(
      screen.getByRole("button", { name: "Показать trace реплики 1" }),
    );
    const panel = within(
      screen.getByRole("region", { name: "Supervisor trace" }),
    );
    expect(panel.getByText("SC11")).toBeInTheDocument();
    expect(panel.getByText("fixture location")).toBeInTheDocument();
    expect(panel.getByText("Действия не выполнялись")).toBeInTheDocument();
  });

  it("does not display a previous successful trace while a new turn is pending", async () => {
    const user = userEvent.setup();
    const client = {
      submit: vi
        .fn()
        .mockImplementationOnce(async (input: TurnInput) => fixture(input))
        .mockImplementationOnce(() => new Promise<TurnResult>(() => {})),
    };
    render(<App client={client} />);
    await send(user, "first fixture");
    await screen.findByText("Тестовый ответ, не живой LLM.");
    await send(user, "pending fixture");
    const panel = within(
      screen.getByRole("region", { name: "Supervisor trace" }),
    );
    expect(panel.queryByText("SC11")).not.toBeInTheDocument();
    expect(panel.getByText("Ожидаем данные маршрутизации")).toBeInTheDocument();
  });

  it("cancels waiting without claiming server cancellation or successful routing", async () => {
    const user = userEvent.setup();
    const client: TurnClient = {
      submit: (_input, signal) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener(
            "abort",
            () => reject(new DOMException("cancelled", "AbortError")),
            { once: true },
          );
        }),
    };
    render(<App client={client} />);
    await send(user, "cancel fixture");
    await user.click(screen.getByRole("button", { name: "Отменить ожидание" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ожидание отменено",
    );
    expect(screen.queryByText("SC11")).not.toBeInTheDocument();
  });
});
