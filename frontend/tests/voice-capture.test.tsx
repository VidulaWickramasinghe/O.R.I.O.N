import axe from "axe-core";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { push, transcribeVoiceCapture } = vi.hoisted(() => ({
  push: vi.fn(),
  transcribeVoiceCapture: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/api/voice", () => ({ transcribeVoiceCapture }));

import { VoiceCapture } from "@/components/aurora/modules/voice-capture";
import { ORION_ASSISTANT_DRAFT_KEY } from "@/lib/voice-handoff";

class TestMediaRecorder {
  state: RecordingState = "inactive";
  mimeType = "audio/webm";
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onstop: ((event: Event) => void) | null = null;

  constructor() {}

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.ondataavailable?.({
      data: new Blob(["bounded voice"], { type: "audio/webm" }),
    } as BlobEvent);
    this.onstop?.(new Event("stop"));
  }
}

describe("VoiceCapture", () => {
  const stopTrack = vi.fn();
  const stream = { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream;
  const getUserMedia = vi.fn();

  beforeEach(() => {
    push.mockReset();
    transcribeVoiceCapture.mockReset();
    stopTrack.mockReset();
    getUserMedia.mockReset().mockResolvedValue(stream);
    vi.stubGlobal("MediaRecorder", TestMediaRecorder);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("requires permission and transcript confirmation before assistant handoff", async () => {
    const user = userEvent.setup();
    transcribeVoiceCapture.mockResolvedValue({
      status: "review_required",
      transcript: "Review this mission request",
      auto_submitted: false,
    });
    render(<VoiceCapture />);

    expect(screen.getByText(/Microphone OFF · permission not requested/)).toBeTruthy();
    expect(transcribeVoiceCapture).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Enable microphone" }));
    await user.click(screen.getByRole("button", { name: "Start push-to-talk" }));
    expect(screen.getByText(/Microphone ON · permission granted/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Stop and transcribe" }));

    const editor = await screen.findByRole("textbox", { name: "Review transcript before handoff" });
    expect((editor as HTMLTextAreaElement).value).toBe("Review this mission request");
    expect(push).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(ORION_ASSISTANT_DRAFT_KEY)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Confirm and review in Assistant" }));
    expect(sessionStorage.getItem(ORION_ASSISTANT_DRAFT_KEY)).toBe("Review this mission request");
    expect(push).toHaveBeenCalledWith("/assistant");
  });

  it("handles denied permission without starting capture", async () => {
    const denied = new Error("denied");
    denied.name = "NotAllowedError";
    getUserMedia.mockRejectedValue(denied);
    const user = userEvent.setup();
    render(<VoiceCapture />);

    await user.click(screen.getByRole("button", { name: "Enable microphone" }));

    expect(await screen.findByRole("heading", { name: "Permission denied" })).toBeTruthy();
    expect(screen.getByText(/Microphone OFF · permission denied/)).toBeTruthy();
    expect(transcribeVoiceCapture).not.toHaveBeenCalled();
  });

  it("discards a cancelled capture without transcription", async () => {
    const user = userEvent.setup();
    render(<VoiceCapture />);

    await user.click(screen.getByRole("button", { name: "Enable microphone" }));
    await user.click(screen.getByRole("button", { name: "Start push-to-talk" }));
    await user.click(screen.getByRole("button", { name: "Cancel capture" }));

    await waitFor(() => expect(screen.getByText("Voice capture cancelled and discarded.")).toBeTruthy());
    expect(transcribeVoiceCapture).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("passes an automated accessibility scan before permission is requested", async () => {
    const { container } = render(<VoiceCapture />);
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
