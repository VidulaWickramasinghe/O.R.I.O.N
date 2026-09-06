import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { ApprovalItem } from "@/components/aurora/aurora-types";
import { ToolsModule } from "@/components/aurora/modules/tools-module";
import { LiveOperationalBoard } from "@/components/aurora/live-operational-board";
import { UserGuide } from "@/components/aurora/user-guide";
import { sidebarGroups } from "@/lib/aurora-data";
import { sidebarLessons } from "@/lib/user-guide";

const state = vi.hoisted(() => ({ missionStatus: "ready", unavailable: false, approvals: [] as ApprovalItem[], post: vi.fn(), refresh: vi.fn() }));
vi.mock("@/lib/api/client", async (original) => ({ ...await original<typeof import("@/lib/api/client")>(), api: { post: state.post } }));
vi.mock("@/components/aurora/lib/aurora-queries", () => {
  const result = (data: unknown) => ({ data: state.unavailable ? undefined : data, isSuccess: !state.unavailable, isPending: false, isLoading: false, isFetching: false, isError: state.unavailable, error: null, dataUpdatedAt: Date.now(), refetch: state.refresh });
  return {
    useAuroraStatus: () => result({ status: "online" }),
    useAuroraSecurityPolicy: () => result({ active_policy: { active_profile: "strict" } }),
    useAuroraMissions: () => result({ missions: [{ id: 1, title: "Daily timetable", status: state.missionStatus, updated_at: "2026-09-06T00:00:00" }] }),
    useAuroraApprovals: (statuses?: string[]) => result({ approvals: state.approvals.filter((approval) => !statuses || statuses.includes(approval.status)) }),
  };
});

afterEach(() => { cleanup(); state.approvals = []; state.missionStatus = "ready"; state.unavailable = false; vi.clearAllMocks(); });
function setup(content: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  render(<QueryClientProvider client={client}>{content}</QueryClientProvider>);
  return { user: userEvent.setup(), invalidate };
}
function approval(status = "pending"): ApprovalItem {
  return { id: 9, title: "Sample folder", description: "Open sample only", action_type: "OPEN_WORKSPACE_FOLDER", payload: {}, idempotency_key: "test-key", mission_id: 2, step_id: 3, risk_level: "medium", status, result: "", source: "test", created_at: "", updated_at: "" };
}

it("explains no request versus policy denial without offering synthetic approvals", () => {
  setup(<ToolsModule pendingOnly onAssistantMessage={vi.fn()} />);
  expect(screen.getByText(/Adding a workspace or saving a mission does not create an approval/)).toBeTruthy();
  expect(screen.getByRole("link", { name: "Why is the queue empty?" }).getAttribute("href")).toBe("/help#approval-workflow");
  expect(screen.queryByRole("button", { name: "Approve once" })).toBeNull();
  expect(state.post).not.toHaveBeenCalled();
});

it("shows terminal history without making completed requests actionable", async () => {
  state.approvals = [approval("rejected")];
  const { user } = setup(<ToolsModule pendingOnly onAssistantMessage={vi.fn()} />);
  expect(screen.queryByText("#9 — Sample folder")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Show recent history" }));
  expect(screen.getByText("#9 — Sample folder")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Approve once" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Show pending only" }));
  expect(screen.queryByText("#9 — Sample folder")).toBeNull();
});

it.each(["approve", "reject"] as const)("refreshes owning mission state after %s", async (action) => {
  state.approvals = [approval()];
  state.post.mockResolvedValue({ status: action === "approve" ? "approved" : "rejected", approval_id: 9, result: "Recorded", replayed: false });
  const { user, invalidate } = setup(<ToolsModule pendingOnly onAssistantMessage={vi.fn()} />);
  if (action === "approve") {
    await user.click(screen.getByRole("button", { name: "Approve once" }));
  } else {
    await user.click(screen.getByRole("button", { name: "Reject" }));
    await user.type(screen.getByPlaceholderText("Explain why this action must not run"), "Training only");
    await user.click(screen.getByRole("button", { name: "Reject with reason" }));
  }
  await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["aurora-missions"] }));
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["aurora-mission-runs"] });
  expect(state.post.mock.calls[0][0]).toBe(`/api/approvals/9/${action}`);
});

it("does not misrepresent a ready plan as current execution", () => {
  setup(<LiveOperationalBoard />);
  expect(screen.queryByText("Daily timetable")).toBeNull();
  expect(screen.getByText("No running or approval-waiting mission in loaded records")).toBeTruthy();
  expect(screen.getByText(/Sources: \/api\/status/)).toBeTruthy();
});

it("shows a running mission and refreshes the live sources", async () => {
  state.missionStatus = "running";
  const { user } = setup(<LiveOperationalBoard />);
  expect(screen.getByText("Daily timetable")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Refresh operational state" }));
  expect(state.refresh).toHaveBeenCalledTimes(4);
});

it("shows unavailable evidence rather than healthy zeroes on failure", () => {
  state.unavailable = true;
  setup(<LiveOperationalBoard />);
  expect(screen.getByText("Approval queue unavailable")).toBeTruthy();
  expect(screen.queryByText("0 waiting · 0 executing")).toBeNull();
  expect(screen.getByText(/Some evidence unavailable/)).toBeTruthy();
});

it("documents every sidebar destination and resolves all guide anchors", () => {
  const { container } = render(<UserGuide />);
  for (const item of sidebarGroups.flatMap((group) => group.items)) {
    expect(sidebarLessons[item.href]?.steps.length).toBeGreaterThan(0);
    expect(sidebarLessons[item.href]?.result.length).toBeGreaterThan(0);
  }
  for (const link of container.querySelectorAll('a[href^="#"]')) {
    expect(container.querySelector(link.getAttribute("href")!)).toBeTruthy();
  }
  expect(screen.getByText(/Production \/ Development \/ Demo in the sidebar is a saved label/)).toBeTruthy();
  expect(screen.getByText(/currently enables the same broad plugin set as Balanced/)).toBeTruthy();
});
