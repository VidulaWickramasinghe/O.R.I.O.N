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

/** Server-only URL used by server components and contract tooling. */
export function getInternalApiBaseUrl(): string {
  return normaliseBaseUrl(
    typeof window === "undefined"
      ? process.env.ORION_INTERNAL_API_URL ?? runtimeConfig.apiBaseUrl
      : runtimeConfig.apiBaseUrl,
  );
}
