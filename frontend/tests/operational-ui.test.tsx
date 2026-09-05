import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ApprovalStatusBadge,
  ConfirmationDialog,
} from "@/components/aurora/operational-ui";
import { approvalDecisionMessage } from "@/components/aurora/modules/tools-module";

describe("operational UI truth and keyboard contracts", () => {
  afterEach(() => cleanup());

  it("labels a pending approval as waiting rather than mission-ready", () => {
    render(<ApprovalStatusBadge status="pending" />);
    expect(screen.getByText("Waiting for approval")).toBeTruthy();
    expect(screen.queryByText("Ready")).toBeNull();
  });

  it("never announces a 200 response with failed execution as approved", () => {
    const message = approvalDecisionMessage("approve", {
      status: "failed",
      approval_id: 42,
      result: "Command exited with status 1",
      replayed: false,
    });
    expect(message).toContain("execution failed");
    expect(message).not.toContain("approved");
  });

  it("focuses, closes with Escape, and restores focus for confirmations", async () => {
    const user = userEvent.setup();
    const close = vi.fn();
    const view = render(
      <>
        <button type="button">Open action</button>
        <ConfirmationDialog open={false} title="Confirm" description="Review this action" confirmLabel="Confirm" onConfirm={() => undefined} onClose={close} />
      </>,
    );
    const opener = screen.getByRole("button", { name: "Open action" });
    opener.focus();
    view.rerender(
      <>
        <button type="button">Open action</button>
        <ConfirmationDialog open title="Confirm" description="Review this action" confirmLabel="Confirm" onConfirm={() => undefined} onClose={close} />
      </>,
    );

    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" })));
    await user.keyboard("{Escape}");
    expect(close).toHaveBeenCalledOnce();
    view.rerender(
      <>
        <button type="button">Open action</button>
        <ConfirmationDialog open={false} title="Confirm" description="Review this action" confirmLabel="Confirm" onConfirm={() => undefined} onClose={close} />
      </>,
    );
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });
});
