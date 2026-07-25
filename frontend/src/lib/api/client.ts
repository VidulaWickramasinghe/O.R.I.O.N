const configuredBase =
  process.env.NEXT_PUBLIC_ORION_API_BASE || "http://127.0.0.1:8000";

export const ORION_API_BASE = configuredBase.replace(/\/+$/, "");

function apiUrl(path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("O.R.I.O.N. API paths must be root-relative.");
  }

  return `${ORION_API_BASE}${path}`;
}

async function parseResponse<T>(response: Response, method: string, path: string) {
  if (!response.ok) {
    const detail = (await response.text()).trim().slice(0, 500);
    throw new Error(
      `${method} ${path} failed with ${response.status}${
        detail ? `: ${detail}` : ""
      }`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path));
  return parseResponse<T>(response, "GET", path);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return parseResponse<T>(response, "POST", path);
}
