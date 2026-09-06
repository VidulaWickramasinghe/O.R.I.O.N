import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { WorkspaceRegistration } from "@/components/aurora/modules/workspace-registration";

const { registerWorkspace } = vi.hoisted(() => ({ registerWorkspace: vi.fn() }));
vi.mock("@/lib/api/workspaces", () => ({ registerWorkspace }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  render(<QueryClientProvider client={client}><WorkspaceRegistration /></QueryClientProvider>);
  return { user: userEvent.setup(), invalidate };
}

it("requires separate explicit trust and source consent and resets them when the path changes", async () => {
  const { user } = setup();
  await user.type(screen.getByLabelText("Workspace name"), "Training");
  await user.type(screen.getByLabelText("Existing folder path"), "/tmp/training");
  expect((screen.getByRole("button", { name: "Register trusted workspace" }) as HTMLButtonElement).disabled).toBe(true);
  for (const checkbox of screen.getAllByRole("checkbox")) await user.click(checkbox);
  expect((screen.getByRole("button", { name: "Register trusted workspace" }) as HTMLButtonElement).disabled).toBe(false);
  await user.type(screen.getByLabelText("Existing folder path"), "-changed");
  expect(screen.getAllByRole("checkbox").every((input) => !(input as HTMLInputElement).checked)).toBe(true);
  expect(registerWorkspace).not.toHaveBeenCalled();
});

it("sends the agreed scope and refreshes the shared workspace cache", async () => {
  registerWorkspace.mockResolvedValue({ status: "registered", workspace_id: 7, path: "/tmp/training" });
  const { user, invalidate } = setup();
  await user.type(screen.getByLabelText("Workspace name"), "Training");
  await user.type(screen.getByLabelText("Existing folder path"), "/tmp/training");
  for (const checkbox of screen.getAllByRole("checkbox")) await user.click(checkbox);
  await user.click(screen.getByRole("button", { name: "Register trusted workspace" }));
  await screen.findByRole("status");
  expect(registerWorkspace.mock.calls[0][0]).toEqual({ name: "Training", path: "/tmp/training", description: "", trusted: true, source_consent: true });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["aurora-workspaces"] });
  expect((screen.getByRole("button", { name: "Register trusted workspace" }) as HTMLButtonElement).disabled).toBe(true);
});

it("retains the draft and displays backend rejection without claiming success", async () => {
  registerWorkspace.mockRejectedValue(new Error("Workspace path does not exist"));
  const { user } = setup();
  await user.type(screen.getByLabelText("Workspace name"), "Training");
  await user.type(screen.getByLabelText("Existing folder path"), "/missing");
  for (const checkbox of screen.getAllByRole("checkbox")) await user.click(checkbox);
  await user.click(screen.getByRole("button", { name: "Register trusted workspace" }));
  expect((await screen.findByRole("alert")).textContent).toContain("does not exist");
  expect((screen.getByLabelText("Existing folder path") as HTMLInputElement).value).toBe("/missing");
  await waitFor(() => expect((screen.getByRole("button", { name: "Register trusted workspace" }) as HTMLButtonElement).disabled).toBe(false));
});
