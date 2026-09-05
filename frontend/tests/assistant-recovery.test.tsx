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
vi.mock("@/components/aurora/lib/aurora-queries", () => ({ useAuroraWorkspaces: () => ({ data: { workspaces: [{ id: 7, name: "Test workspace" }] } }) }));

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

  it("sends the reviewed hash and resets conversation history after context choices change", async () => {
    const user = userEvent.setup();
    previewChatContext.mockResolvedValue({ context: "Reviewed content", context_hash: "review-hash", system_instructions: "Policy" });
    sendChatMessage.mockResolvedValue({ response: "Done", conversation_id: "conversation-1", status: "completed", provider: "openai", model: "selected-model" });
    render(<AssistantWorkspace />);
    const editor = await screen.findByRole("textbox", { name: "Message O.R.I.O.N." });
    await user.type(editor, "Inspect this goal");
    await user.click(screen.getByRole("button", { name: "Preview Context" }));
    expect(await screen.findByText("Reviewed content")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(sendChatMessage.mock.calls[0][1].expected_context_hash).toBe("review-hash");
    expect(await screen.findByText("openai · selected-model")).toBeTruthy();
    await user.click(screen.getByRole("checkbox", { name: "Memory" }));
    await user.type(editor, "New scope");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(sendChatMessage.mock.calls[1][1]).toMatchObject({ conversation_id: undefined, context_options: { memory: false, semantic: false, activity: false } });
    expect(sendChatMessage.mock.calls[1][1].client_scope_id).not.toBe(sendChatMessage.mock.calls[0][1].client_scope_id);
  });

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
