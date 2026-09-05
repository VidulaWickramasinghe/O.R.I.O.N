import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { MissionAuthor } from "@/components/aurora/modules/mission-author";

const { createMission } = vi.hoisted(() => ({ createMission: vi.fn() }));
vi.mock("@/lib/api/missions", () => ({ createMission }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

it("saves a reviewed free-form plan in the user's chosen order", async () => {
  createMission.mockResolvedValue({ id: 42, status: "planned" });
  const user = userEvent.setup();
  render(<QueryClientProvider client={new QueryClient()}><MissionAuthor /></QueryClientProvider>);
  await user.type(screen.getByLabelText("Mission title"), "Review application");
  await user.type(screen.getByLabelText("Goal"), "Find the next safe change");
  await user.type(screen.getByLabelText("Step 1"), "Report evidence");
  await user.click(screen.getByRole("button", { name: "Add step" }));
  await user.type(screen.getByLabelText("Step 2"), "Inspect workspace");
  await user.click(screen.getByRole("button", { name: "Move step 2 up" }));
  await user.click(screen.getByRole("button", { name: "Save mission plan" }));
  expect(await screen.findByRole("status")).toBeTruthy();
  expect(createMission.mock.calls[0][0]).toEqual({ title: "Review application", goal: "Find the next safe change", steps: ["Inspect workspace", "Report evidence"], priority: 3 });
});
