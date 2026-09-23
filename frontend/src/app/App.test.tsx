import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { TurnClient } from "../shared/turn-client/client";
import type { TurnInput, TurnResult } from "../shared/turn-client/schema";
import { validTurnPayload } from "../test/turn-fixture";
import { App } from "./App";

function resultFor(input: TurnInput, turn: number): TurnResult {
  return {
    ...validTurnPayload,
    session_id: input.session_id,
    turn,
    transcript: input.text,
    assistant_text: `Ответ ${turn}`,
  };
}

class RecordingClient implements TurnClient {
  readonly inputs: TurnInput[] = [];

  async submit(input: TurnInput) {
    this.inputs.push(input);
    return resultFor(input, this.inputs.length);
  }
}

describe("App", () => {
  it("keeps one session and a trace attached to every completed turn", async () => {
    const user = userEvent.setup();
    const client = new RecordingClient();
    render(<App client={client} />);

    const input = screen.getByLabelText("Сообщение клиента");
    await user.type(input, "Первый вопрос");
    await user.click(screen.getByRole("button", { name: "Отправить" }));
    expect(await screen.findByText("Ответ 1")).toBeInTheDocument();

    await user.type(input, "Второй вопрос");
    await user.click(screen.getByRole("button", { name: "Отправить" }));
    expect(await screen.findByText("Ответ 2")).toBeInTheDocument();

    expect(client.inputs).toHaveLength(2);
    expect(client.inputs[0]?.session_id).toBe(client.inputs[1]?.session_id);
    expect(screen.getAllByText("Первый вопрос").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Второй вопрос").length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("heading", {
        name: "Supervisor trace · реплика 2",
      }),
    ).toHaveLength(1);
    const tracePanel = within(
      screen.getByRole("region", { name: "Supervisor trace" }),
    );
    expect(tracePanel.getByText("Второй вопрос")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Показать trace реплики 1" }),
    );
    expect(tracePanel.getByText("Первый вопрос")).toBeInTheDocument();
  });

  it("renders all trace fields without treating confirmation as an action", async () => {
    const user = userEvent.setup();
    render(<App client={new RecordingClient()} />);

    await user.type(
      screen.getByLabelText("Сообщение клиента"),
      "Статус заявки",
    );
    await user.click(screen.getByRole("button", { name: "Отправить" }));

    expect(await screen.findByText("SC11")).toBeInTheDocument();
    expect(screen.getByText("SC13")).toBeInTheDocument();
    const firstScenario = within(
      screen.getByRole("article", { name: "Сценарий SC11" }),
    );
    const secondScenario = within(
      screen.getByRole("article", { name: "Сценарий SC13" }),
    );
    expect(firstScenario.getByText(/91\s*%/)).toBeInTheDocument();
    expect(
      firstScenario.getByText("Совпали признаки статуса заявки"),
    ).toBeInTheDocument();
    expect(secondScenario.getByText(/67\s*%/)).toBeInTheDocument();
    expect(
      secondScenario.getByText("Есть дополнительный вопрос"),
    ).toBeInTheDocument();
    expect(screen.getByText("unknown")).toBeInTheDocument();
    expect(screen.getByText("policy_number")).toBeInTheDocument();
    expect(screen.getByText("P-42")).toBeInTheDocument();
    expect(screen.getByText("Действия не выполнялись")).toBeInTheDocument();
    expect(screen.getByText("Требуется подтверждение")).toBeInTheDocument();
    expect(screen.getByText("Действие ещё не выполнено")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });

  it.each(["kk", "mixed"] as const)(
    "renders the backend language value %s",
    async (language) => {
      const user = userEvent.setup();
      const client: TurnClient = {
        submit: async () => ({
          ...validTurnPayload,
          trace: { ...validTurnPayload.trace, language },
        }),
      };
      render(<App client={client} />);

      await user.type(screen.getByLabelText("Сообщение клиента"), "Тіл тесті");
      await user.click(screen.getByRole("button", { name: "Отправить" }));

      expect(
        await screen.findByText(language, { exact: true }),
      ).toBeInTheDocument();
    },
  );

  it("renders clarification and handoff states returned by the backend", async () => {
    const user = userEvent.setup();
    const client: TurnClient = {
      submit: async () => ({
        ...validTurnPayload,
        trace: {
          ...validTurnPayload.trace,
          needs_clarification: true,
          handoff: true,
        },
      }),
    };
    render(<App client={client} />);

    await user.type(screen.getByLabelText("Сообщение клиента"), "Нужна помощь");
    await user.click(screen.getByRole("button", { name: "Отправить" }));

    const tracePanel = within(
      screen.getByRole("region", { name: "Supervisor trace" }),
    );
    expect(await tracePanel.findByText("Уточнение")).toBeInTheDocument();
    expect(tracePanel.getByText("Передача оператору")).toBeInTheDocument();
    expect(tracePanel.getByText("Подтверждение")).toBeInTheDocument();
    expect(tracePanel.getByText("Продолжение диалога")).toBeInTheDocument();
    expect(tracePanel.getByText("Требуется оператор")).toBeInTheDocument();
  });

  it("locks duplicate submission while the turn is pending", async () => {
    const user = userEvent.setup();
    let resolveTurn: ((result: TurnResult) => void) | undefined;
    const client: TurnClient = {
      submit: vi.fn(
        (input: TurnInput) =>
          new Promise<TurnResult>((resolve) => {
            resolveTurn = (result) =>
              resolve({ ...result, session_id: input.session_id });
          }),
      ),
    };
    render(<App client={client} />);

    await user.type(screen.getByLabelText("Сообщение клиента"), "Запрос");
    await user.click(screen.getByRole("button", { name: "Отправить" }));

    expect(screen.getByRole("button", { name: "Отправляем…" })).toBeDisabled();
    expect(client.submit).toHaveBeenCalledTimes(1);

    resolveTurn?.(validTurnPayload);
    expect(await screen.findByText("Проверяю статус.")).toBeInTheDocument();
  });

  it("keeps the failed turn and retries through the same client session", async () => {
    const user = userEvent.setup();
    const inputs: TurnInput[] = [];
    const client: TurnClient = {
      submit: vi.fn(async (input: TurnInput) => {
        inputs.push(input);
        if (inputs.length === 1) throw new Error("offline");
        return resultFor(input, 1);
      }),
    };
    render(<App client={client} />);

    await user.type(
      screen.getByLabelText("Сообщение клиента"),
      "Повтори запрос",
    );
    await user.click(screen.getByRole("button", { name: "Отправить" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Не удалось обработать запрос.",
    );

    await user.click(screen.getByRole("button", { name: "Попробовать снова" }));
    expect(await screen.findByText("Ответ 1")).toBeInTheDocument();
    expect(inputs).toHaveLength(2);
    expect(inputs[0]?.session_id).toBe(inputs[1]?.session_id);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen
        .getByRole("region", { name: "Conversation" })
        .querySelectorAll("[class*='userBubble']"),
    ).toHaveLength(1);
  });
});
