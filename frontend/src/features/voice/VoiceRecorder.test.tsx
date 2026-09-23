import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceRecorder } from "./VoiceRecorder";

// Only the browser media boundary is replaced. Events preserve browser ordering:
// stopping queues the final data chunk before the stop event.
class BrowserRecorder {
  static supported = ["audio/webm;codecs=opus"];
  static instances: BrowserRecorder[] = [];
  static isTypeSupported = (type: string) => this.supported.includes(type);
  state = "inactive";
  mimeType: string;
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  finalChunk = new Blob(["message"], { type: "audio/webm;codecs=opus" });

  constructor(_stream: MediaStream, options: MediaRecorderOptions) {
    this.mimeType = options.mimeType ?? "";
    BrowserRecorder.instances.push(this);
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    queueMicrotask(() => {
      this.ondataavailable?.({ data: this.finalChunk });
      this.onstop?.();
    });
  }
  data(data: Blob) {
    this.ondataavailable?.({ data });
  }
}

function microphone() {
  const tracks = [0, 1].map(() => ({
    readyState: "live",
    stop() {
      this.readyState = "ended";
    },
  }));
  return {
    tracks,
    stream: { getTracks: () => tracks } as unknown as MediaStream,
  };
}

function latestRecorder() {
  return BrowserRecorder.instances.at(-1)!;
}

async function click(name: string) {
  await act(async () => fireEvent.click(screen.getByRole("button", { name })));
}

describe("VoiceRecorder", () => {
  let mic: ReturnType<typeof microphone>;
  let getUserMedia: ReturnType<typeof vi.fn<() => Promise<MediaStream>>>;

  beforeEach(() => {
    mic = microphone();
    getUserMedia = vi.fn(async () => mic.stream);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    vi.stubGlobal("MediaRecorder", BrowserRecorder);
    BrowserRecorder.supported = ["audio/webm;codecs=opus"];
    BrowserRecorder.instances = [];
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("opens the microphone only after an explicit enabled click", async () => {
    const view = render(<VoiceRecorder disabled onRecorded={vi.fn()} />);
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Начать запись" }),
    ).toBeDisabled();
    await click("Начать запись");
    expect(getUserMedia).not.toHaveBeenCalled();
    view.rerender(<VoiceRecorder disabled={false} onRecorded={vi.fn()} />);
    await click("Начать запись");
    expect(getUserMedia).toHaveBeenCalledExactlyOnceWith({ audio: true });
    expect(
      screen.getByRole("button", { name: "Остановить и отправить" }),
    ).toBeEnabled();
  });

  it("delivers one nonempty recording and releases every microphone track", async () => {
    const onRecorded = vi.fn();
    const onBusyChange = vi.fn();
    render(
      <VoiceRecorder
        disabled={false}
        onRecorded={onRecorded}
        onBusyChange={onBusyChange}
      />,
    );
    await click("Начать запись");
    expect(onBusyChange).toHaveBeenLastCalledWith(true);
    await click("Остановить и отправить");
    expect(onRecorded).toHaveBeenCalledTimes(1);
    const [blob] = onRecorded.mock.calls[0] as [Blob];
    expect(blob.size).toBe(7);
    expect(blob.type).toBe("audio/webm;codecs=opus");
    expect(mic.tracks.every((track) => track.readyState === "ended")).toBe(
      true,
    );
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole("button", { name: "Начать запись" })).toBeEnabled();
  });

  it("cancels without delivering a final chunk or retaining the microphone", async () => {
    const onRecorded = vi.fn();
    render(<VoiceRecorder disabled={false} onRecorded={onRecorded} />);
    await click("Начать запись");
    await click("Отменить запись");
    expect(onRecorded).not.toHaveBeenCalled();
    expect(mic.tracks.every((track) => track.readyState === "ended")).toBe(
      true,
    );
    expect(screen.getByRole("button", { name: "Начать запись" })).toBeEnabled();
  });

  it.each(["cancel", "unmount"])(
    "releases a late permission result after %s",
    async (ending) => {
      let resolvePermission!: (stream: MediaStream) => void;
      getUserMedia.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePermission = resolve;
          }),
      );
      const onRecorded = vi.fn();
      const view = render(
        <VoiceRecorder disabled={false} onRecorded={onRecorded} />,
      );
      await click("Начать запись");
      if (ending === "cancel") await click("Отменить запись");
      else view.unmount();
      await act(async () => resolvePermission(mic.stream));
      expect(mic.tracks.every((track) => track.readyState === "ended")).toBe(
        true,
      );
      expect(onRecorded).not.toHaveBeenCalled();
      expect(BrowserRecorder.instances).toHaveLength(0);
    },
  );

  it("releases active recording resources on unmount without sending", async () => {
    const onRecorded = vi.fn();
    const view = render(
      <VoiceRecorder disabled={false} onRecorded={onRecorded} />,
    );
    await click("Начать запись");
    view.unmount();
    await act(async () => {});
    expect(mic.tracks.every((track) => track.readyState === "ended")).toBe(
      true,
    );
    expect(latestRecorder().state).toBe("inactive");
    expect(onRecorded).not.toHaveBeenCalled();
  });

  it("explains permission denial and offers text fallback", async () => {
    getUserMedia.mockRejectedValue(
      new DOMException("denied", "NotAllowedError"),
    );
    render(<VoiceRecorder disabled={false} onRecorded={vi.fn()} />);
    await click("Начать запись");
    expect(screen.getByRole("alert")).toHaveTextContent(/доступ.*микрофон/i);
    expect(screen.getByRole("alert")).toHaveTextContent(/текст/i);
    expect(screen.getByRole("button", { name: "Начать запись" })).toBeEnabled();
  });

  it.each(["recorder", "mediaDevices", "format"])(
    "offers text fallback when %s is unsupported",
    async (missing) => {
      if (missing === "recorder") vi.stubGlobal("MediaRecorder", undefined);
      if (missing === "mediaDevices") vi.stubGlobal("navigator", {});
      if (missing === "format") BrowserRecorder.supported = [];
      render(<VoiceRecorder disabled={false} onRecorded={vi.fn()} />);
      await click("Начать запись");
      expect(screen.getByRole("alert")).toHaveTextContent(/текст/i);
      expect(getUserMedia).not.toHaveBeenCalled();
    },
  );

  it("records MP4 when it is the browser's supported API format", async () => {
    BrowserRecorder.supported = ["audio/mp4"];
    const onRecorded = vi.fn();
    render(<VoiceRecorder disabled={false} onRecorded={onRecorded} />);
    await click("Начать запись");
    latestRecorder().finalChunk = new Blob(["mp4"], { type: "audio/mp4" });
    await click("Остановить и отправить");
    expect((onRecorded.mock.calls[0] as [Blob])[0].type).toBe("audio/mp4");
  });

  it("stops at 60 seconds and sends the collected recording", async () => {
    vi.useFakeTimers();
    const onRecorded = vi.fn();
    render(<VoiceRecorder disabled={false} onRecorded={onRecorded} />);
    await click("Начать запись");
    await act(async () => vi.advanceTimersByTime(59_999));
    expect(onRecorded).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1));
    expect(onRecorded).toHaveBeenCalledTimes(1);
    expect(mic.tracks.every((track) => track.readyState === "ended")).toBe(
      true,
    );
  });

  it("rejects accumulated audio over 20 MiB and releases the microphone", async () => {
    const onRecorded = vi.fn();
    render(<VoiceRecorder disabled={false} onRecorded={onRecorded} />);
    await click("Начать запись");
    act(() => {
      latestRecorder().data(new Blob([new Uint8Array(20 * 1024 * 1024)]));
      latestRecorder().data(new Blob(["x"]));
    });
    await act(async () => {});
    expect(onRecorded).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/20 MiB/);
    expect(mic.tracks.every((track) => track.readyState === "ended")).toBe(
      true,
    );
  });

  it("does not submit an empty recording", async () => {
    const onRecorded = vi.fn();
    render(<VoiceRecorder disabled={false} onRecorded={onRecorded} />);
    await click("Начать запись");
    latestRecorder().finalChunk = new Blob([]);
    await click("Остановить и отправить");
    expect(onRecorded).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/пуст|звук/i);
    expect(mic.tracks.every((track) => track.readyState === "ended")).toBe(
      true,
    );
  });

  it("cleans up recorder failure and keeps text fallback available", async () => {
    const onRecorded = vi.fn();
    render(<VoiceRecorder disabled={false} onRecorded={onRecorded} />);
    await click("Начать запись");
    await act(async () => latestRecorder().onerror?.());
    expect(onRecorded).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/текст/i);
    expect(mic.tracks.every((track) => track.readyState === "ended")).toBe(
      true,
    );
    expect(screen.getByRole("button", { name: "Начать запись" })).toBeEnabled();
  });
});
