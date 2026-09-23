import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AudioApiError } from "../../shared/turn-client/audio";
import { VoicePlayer } from "./VoicePlayer";

const receivedAudio = {
  mime_type: "audio/mpeg" as const,
  base64: "SUQz",
  ai_generated: true as const,
};
const mp3 = () => new Blob(["ID3"], { type: "audio/mpeg" });

function deferredAudio() {
  let resolve!: (blob: Blob) => void;
  const promise = new Promise<Blob>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("VoicePlayer", () => {
  const createObjectURL = vi.fn<(blob: Blob) => string>();
  const revokeObjectURL = vi.fn<(url: string) => void>();

  beforeEach(() => {
    let nextUrl = 0;
    createObjectURL
      .mockReset()
      .mockImplementation(() => `blob:voice-${++nextUrl}`);
    revokeObjectURL.mockReset();
    vi.stubGlobal(
      "URL",
      class extends URL {
        static createObjectURL = createObjectURL;
        static revokeObjectURL = revokeObjectURL;
      },
    );
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("offers native controls and an AI disclosure without automatic playback", () => {
    const synthesize = vi.fn();
    render(
      <VoicePlayer
        audio={receivedAudio}
        text="Ответ"
        synthesize={synthesize}
      />,
    );

    const player = screen.getByLabelText("Озвучка ответа") as HTMLAudioElement;
    expect(player).toHaveAttribute("controls");
    expect(player.autoplay).toBe(false);
    expect(player).toHaveAttribute("src", "blob:voice-1");
    expect(screen.getByText(/голос создан ИИ/i)).toBeInTheDocument();
    expect(synthesize).not.toHaveBeenCalled();
    expect(createObjectURL.mock.calls[0]?.[0]).toMatchObject({
      type: "audio/mpeg",
      size: 3,
    });
  });

  it("releases object URLs when audio changes and when the player unmounts", () => {
    const synthesize = vi.fn();
    const { rerender, unmount } = render(
      <VoicePlayer
        audio={receivedAudio}
        text="Ответ"
        synthesize={synthesize}
      />,
    );
    rerender(
      <VoicePlayer
        audio={{ ...receivedAudio, base64: "SUQzBA==" }}
        text="Другой ответ"
        synthesize={synthesize}
      />,
    );

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:voice-1");
    expect(screen.getByLabelText("Озвучка ответа")).toHaveAttribute(
      "src",
      "blob:voice-2",
    );
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:voice-2");
  });

  it("retries only synthesis with the existing answer after an HTTP failure", async () => {
    const user = userEvent.setup();
    const synthesize = vi
      .fn()
      .mockRejectedValueOnce(new AudioApiError("provider secret", "http", 503))
      .mockResolvedValueOnce(mp3());
    render(<VoicePlayer text="Готовый ответ" synthesize={synthesize} />);

    expect(synthesize).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Озвучить ответ" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/озвуч/i);
    expect(screen.queryByText(/provider secret/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Повторить озвучку" }));

    expect(await screen.findByLabelText("Озвучка ответа")).toHaveAttribute(
      "src",
      "blob:voice-1",
    );
    expect(synthesize).toHaveBeenCalledTimes(2);
    expect(synthesize).toHaveBeenNthCalledWith(
      1,
      "Готовый ответ",
      expect.any(AbortSignal),
    );
    expect(synthesize).toHaveBeenNthCalledWith(
      2,
      "Готовый ответ",
      expect.any(AbortSignal),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a safe retry when the completed turn reported an audio error", async () => {
    const user = userEvent.setup();
    const synthesize = vi.fn().mockResolvedValue(mp3());
    render(
      <VoicePlayer
        audioError="provider detail"
        text="Ответ сохранён"
        synthesize={synthesize}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/озвуч/i);
    expect(screen.queryByText(/provider detail/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Повторить озвучку" }));
    expect(await screen.findByLabelText("Озвучка ответа")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("blocks duplicate requests and cancels a pending synthesis without accepting its late response", async () => {
    const user = userEvent.setup();
    const first = deferredAudio();
    const synthesize = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(mp3());
    render(<VoicePlayer text="Ответ" synthesize={synthesize} />);

    await user.dblClick(screen.getByRole("button", { name: "Озвучить ответ" }));
    expect(synthesize).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent(/готовим озвучку/i);
    await user.click(screen.getByRole("button", { name: "Отменить озвучку" }));
    expect(synthesize.mock.calls[0]?.[1].aborted).toBe(true);
    expect(screen.getByRole("status")).toHaveTextContent(/отменено/i);
    await user.click(screen.getByRole("button", { name: "Повторить озвучку" }));
    expect(await screen.findByLabelText("Озвучка ответа")).toHaveAttribute(
      "src",
      "blob:voice-1",
    );

    await act(async () => first.resolve(mp3()));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Озвучка ответа")).toHaveAttribute(
      "src",
      "blob:voice-1",
    );
  });

  it("aborts on unmount and never allocates a URL for a late response", async () => {
    const user = userEvent.setup();
    const pending = deferredAudio();
    const synthesize = vi.fn().mockReturnValue(pending.promise);
    const { unmount } = render(
      <VoicePlayer text="Ответ" synthesize={synthesize} />,
    );
    await user.click(screen.getByRole("button", { name: "Озвучить ответ" }));

    unmount();
    expect(synthesize.mock.calls[0]?.[1].aborted).toBe(true);
    await act(async () => pending.resolve(mp3()));
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("aborts synthesis when the answer changes and ignores audio for the previous text", async () => {
    const user = userEvent.setup();
    const pending = deferredAudio();
    const synthesize = vi
      .fn()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(mp3());
    const { rerender } = render(
      <VoicePlayer text="Первый ответ" synthesize={synthesize} />,
    );
    await user.click(screen.getByRole("button", { name: "Озвучить ответ" }));

    rerender(<VoicePlayer text="Новый ответ" synthesize={synthesize} />);
    expect(synthesize.mock.calls[0]?.[1].aborted).toBe(true);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await act(async () => pending.resolve(mp3()));

    expect(screen.queryByLabelText("Озвучка ответа")).not.toBeInTheDocument();
    expect(createObjectURL).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Озвучить ответ" }));
    expect(synthesize).toHaveBeenNthCalledWith(
      2,
      "Новый ответ",
      expect.any(AbortSignal),
    );
    expect(await screen.findByLabelText("Озвучка ответа")).toHaveAttribute(
      "src",
      "blob:voice-1",
    );
  });

  it.each(["", "%%%", "A===", "SUQz_"])(
    "reports malformed embedded audio %j and allows synthesis instead",
    async (base64) => {
      const user = userEvent.setup();
      const synthesize = vi.fn().mockResolvedValue(mp3());
      render(
        <VoicePlayer
          audio={{ ...receivedAudio, base64 }}
          text="Ответ"
          synthesize={synthesize}
        />,
      );

      expect(screen.getByRole("alert")).toHaveTextContent(/аудио/i);
      expect(createObjectURL).not.toHaveBeenCalled();
      await user.click(
        screen.getByRole("button", { name: "Повторить озвучку" }),
      );
      expect(
        await screen.findByLabelText("Озвучка ответа"),
      ).toBeInTheDocument();
    },
  );

  it("rejects oversized embedded audio before allocating browser media resources", () => {
    render(
      <VoicePlayer
        audio={{ ...receivedAudio, base64: "AAAA".repeat(7 * 1024 * 1024) }}
        text="Ответ"
        synthesize={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/аудио/i);
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("exposes native playback failures and offers a fresh synthesis", async () => {
    const user = userEvent.setup();
    const synthesize = vi.fn().mockResolvedValue(mp3());
    render(
      <VoicePlayer
        audio={receivedAudio}
        text="Ответ"
        synthesize={synthesize}
      />,
    );

    fireEvent.error(screen.getByLabelText("Озвучка ответа"));
    expect(screen.getByRole("alert")).toHaveTextContent(/воспроизвести/i);
    await user.click(screen.getByRole("button", { name: "Повторить озвучку" }));
    expect(await screen.findByLabelText("Озвучка ответа")).toHaveAttribute(
      "src",
      "blob:voice-2",
    );
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:voice-1");
  });

  it("does not send blank answer text for synthesis", () => {
    render(<VoicePlayer text="   " synthesize={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Озвучить ответ" }),
    ).toBeDisabled();
  });
});
