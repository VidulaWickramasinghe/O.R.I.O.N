import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  isTauri: () => false,
}));

const firstToken = `first-${"a".repeat(48)}`;
const secondToken = `second-${"b".repeat(48)}`;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("standalone development API authentication", () => {
  it("waits for a cold session before issuing any protected request", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ detail: "Starting" }, 503))
      .mockResolvedValueOnce(jsonResponse({ baseUrl: "http://127.0.0.1:8000", token: firstToken }))
      .mockResolvedValueOnce(jsonResponse({ status: "online" }));
    vi.stubGlobal("fetch", fetchMock);
    const { apiGet } = await import("@/lib/api/client");
    const result = apiGet("/api/status");
    await vi.advanceTimersByTimeAsync(250);
    await expect(result).resolves.toEqual({ status: "online" });
    expect(fetchMock.mock.calls.slice(0, 2).every((call) => call[0] === "/__orion/api-session")).toBe(true);
    expect(new Headers(fetchMock.mock.calls[2][1].headers).get("Authorization")).toBe(`Bearer ${firstToken}`);
  });

  it("never floods protected endpoints when session bootstrap is unavailable", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ detail: "Starting" }, 503));
    vi.stubGlobal("fetch", fetchMock);
    const { apiGet } = await import("@/lib/api/client");
    const result = expect(apiGet("/api/status")).rejects.toMatchObject({ code: "SESSION_STARTING", status: 503 });
    await vi.advanceTimersByTimeAsync(2000);
    await result;
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls.every((call) => call[0] === "/__orion/api-session")).toBe(true);
  });

  it("negotiates an in-memory session before a protected request", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ baseUrl: "http://127.0.0.1:8000", token: firstToken }))
      .mockResolvedValueOnce(jsonResponse({ status: "online" }));
    vi.stubGlobal("fetch", fetchMock);

    const { apiGet } = await import("@/lib/api/client");
    await expect(apiGet("/api/status")).resolves.toEqual({ status: "online" });

    expect(fetchMock.mock.calls[0][0]).toBe("/__orion/api-session");
    const apiHeaders = new Headers(fetchMock.mock.calls[1][1]?.headers);
    expect(apiHeaders.get("Authorization")).toBe(`Bearer ${firstToken}`);
  });

  it("renegotiates once after a stale token is rejected before route execution", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ baseUrl: "http://127.0.0.1:8000", token: firstToken }))
      .mockResolvedValueOnce(jsonResponse({ detail: "Local control API authentication required." }, 401))
      .mockResolvedValueOnce(jsonResponse({ baseUrl: "http://127.0.0.1:8000", token: secondToken }))
      .mockResolvedValueOnce(jsonResponse({ updated: true }));
    vi.stubGlobal("fetch", fetchMock);

    const { apiPost } = await import("@/lib/api/client");
    await expect(apiPost("/api/user-settings/theme", { value: "dark" })).resolves.toEqual({ updated: true });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    const retryHeaders = new Headers(fetchMock.mock.calls[3][1]?.headers);
    expect(retryHeaders.get("Authorization")).toBe(`Bearer ${secondToken}`);
  });

  it("keeps the public health probe credential-free", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ status: "ok" }));
    vi.stubGlobal("fetch", fetchMock);

    const { apiGet } = await import("@/lib/api/client");
    await apiGet("/api/health");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(headers.has("Authorization")).toBe(false);
  });
});
