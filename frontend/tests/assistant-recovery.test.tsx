import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getSystemStatus, previewChatContext, sendChatMessage } = vi.hoisted(() => ({
  getSystemStatus: vi.fn(),
  previewChatContext: vi.fn(),
  sendChatMessage: vi.fn(),
}));

vi.mock("@/lib/api/status", () => ({ getSystemStatus }));
vi.mock("@/lib/api/chat", () => ({ previewChatContext, sendChatMessage }));

import { AssistantWorkspace } from "@/components/assistant/assistant-workspace";
import { ORION_ASSISTANT_DRAFT_KEY } from "@/lib/voice-handoff";

describe("AssistantWorkspace recovery", () => {
  beforeEach(() => {
    getSystemStatus.mockReset().mockResolvedValue({ status: "online", version: "6.7.0" });
    previewChatContext.mockReset();
    sendChatMessage.mockReset();
    sessionStorage.clear();
  });

  afterEach(() => cleanup());

  it("consumes a reviewed voice transcript as an unsent draft", async () => {
    sessionStorage.setItem(ORION_ASSISTANT_DRAFT_KEY, "Reviewed voice request");
    render(<AssistantWorkspace />);

    const editor = await screen.findByRole("textbox", { name: "Message O.R.I.O.N." });
    expect((editor as HTMLTextAreaElement).value).toBe("Reviewed voice request");
    expect(sessionStorage.getItem(ORION_ASSISTANT_DRAFT_KEY)).toBeNull();
    expect(sendChatMessage).not.toHaveBeenCalled();
  });

  it("restores the exact draft after a recoverable provider failure", async () => {
    const user = userEvent.setup();
    sendChatMessage.mockResolvedValue({
      response: "Model provider unavailable.",
      conversation_id: "conversation-1",
      client_scope_id: "scope-1",
      provider: "openai",
      model: "test",
      status: "recoverable_failure",
      recoverable: true,
      usage: {},
    });
    render(<AssistantWorkspace />);
    const editor = await screen.findByRole("textbox", { name: "Message O.R.I.O.N." });

    await user.type(editor, "Do not lose this request");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("heading", { name: "AI provider unavailable" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Restore draft" }));
    expect((editor as HTMLTextAreaElement).value).toBe("Do not lose this request");
  });
});
