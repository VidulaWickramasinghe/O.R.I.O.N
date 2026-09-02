import axe from "axe-core";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RecoveryState } from "@/components/aurora/feedback/RecoveryState";
import { RECOVERY_STATES, type RecoveryCode } from "@/lib/recovery";

describe("RecoveryState", () => {
  afterEach(() => cleanup());

  it.each(Object.keys(RECOVERY_STATES) as RecoveryCode[])(
    "provides a specific message and keyboard action for %s",
    async (code) => {
      const action = vi.fn();
      const user = userEvent.setup();
      const { unmount } = render(
        <RecoveryState code={code} onAction={action} focusOnChange={false} />,
      );

      expect(screen.getByText(RECOVERY_STATES[code].title)).toBeTruthy();
      expect(screen.getByText(RECOVERY_STATES[code].description)).toBeTruthy();
      const button = screen.getByRole("button", {
        name: new RegExp(RECOVERY_STATES[code].actionLabel, "i"),
      });
      button.focus();
      await user.keyboard("{Enter}");
      expect(action).toHaveBeenCalledOnce();
      unmount();
    },
  );

  it("announces urgent recovery and moves focus to its heading", async () => {
    render(<RecoveryState code="backend_offline" onAction={() => undefined} />);
    const alert = screen.getByRole("alert");
    const heading = screen.getByRole("heading", { name: "Local backend unavailable" });

    expect(alert.getAttribute("aria-live")).toBe("assertive");
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });

  it("passes an automated accessibility scan", async () => {
    const { container } = render(
      <main>
        <h1>System recovery</h1>
        <RecoveryState code="sidecar_crashed" onAction={() => undefined} />
      </main>,
    );
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
