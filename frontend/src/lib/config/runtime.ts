const LOCAL_API_URL = "http://127.0.0.1:8000";

function normaliseBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  return trimmed || LOCAL_API_URL;
}

/** Browser-safe runtime values. Never place credentials in this object. */
export const runtimeConfig = {
  apiBaseUrl: normaliseBaseUrl(
    process.env.NEXT_PUBLIC_ORION_API_URL ??
      process.env.NEXT_PUBLIC_ORION_API_BASE ??
      LOCAL_API_URL,
  ),
  requestTimeoutMs: 20_000,
} as const;

export class RuntimeConfigurationError extends Error {
  readonly code = "INSECURE_API_URL";

  constructor(message: string) {
    super(message);
    this.name = "RuntimeConfigurationError";
  }
}

/** Resolve a browser-safe origin, including HTTPS Codespaces port forwarding. */
export function getBrowserApiBaseUrl(): string {
  if (typeof window === "undefined") return runtimeConfig.apiBaseUrl;

  const configured = new URL(runtimeConfig.apiBaseUrl);
  if (window.location.protocol !== "https:" || configured.protocol === "https:") {
    return configured.toString().replace(/\/$/, "");
  }

  const previewHost = window.location.hostname.match(/^(.+)-(\d+)\.app\.github\.dev$/);
  const isLoopback = configured.hostname === "127.0.0.1" || configured.hostname === "localhost";
  if (isLoopback && previewHost) {
    return `https://${previewHost[1]}-${configured.port || "8000"}.app.github.dev`;
  }

  throw new RuntimeConfigurationError(
    "Aurora OS is running over HTTPS, but NEXT_PUBLIC_ORION_API_URL uses HTTP. Configure an HTTPS backend URL to connect safely.",
  );
}

/** Server-only URL used by server components and contract tooling. */
export function getInternalApiBaseUrl(): string {
  return normaliseBaseUrl(
    typeof window === "undefined"
      ? process.env.ORION_INTERNAL_API_URL ?? runtimeConfig.apiBaseUrl
      : runtimeConfig.apiBaseUrl,
  );
}
