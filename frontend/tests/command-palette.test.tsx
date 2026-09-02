import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { CommandPalette } from "@/components/aurora/command-palette";
import { useUiStore } from "@/store/ui-store";

describe("CommandPalette", () => {
  beforeEach(() => {
    push.mockReset();
    useUiStore.setState({
      commandOpen: true,
      contextOpen: true,
    });
  });

  afterEach(() => cleanup());

  it("filters commands as the operator types", async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);

    await user.type(screen.getByRole("textbox", { name: "Search commands" }), "browser research");

    expect(screen.getByRole("option", { name: /Open Browser Research/ })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /Open Missions/ })).toBeNull();
  });

  it("executes the selected navigation command with Enter", async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    const search = screen.getByRole("textbox", { name: "Search commands" });

    await user.type(search, "open missions");
    await user.keyboard("{Enter}");

    expect(push).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledWith("/missions");
    expect(useUiStore.getState().commandOpen).toBe(false);
  });

  it("supports wraparound arrow-key selection", async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);

    await user.keyboard("{ArrowUp}{Enter}");

    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });

  it("requires an explicit confirmation before a mutation", async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    const search = screen.getByRole("textbox", { name: "Search commands" });

    await user.type(search, "toggle live context");
    await user.keyboard("{Enter}");

    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(useUiStore.getState().contextOpen).toBe(true);
    expect(push).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Confirm action" }));

    expect(useUiStore.getState().contextOpen).toBe(false);
    expect(useUiStore.getState().commandOpen).toBe(false);
  });
});
