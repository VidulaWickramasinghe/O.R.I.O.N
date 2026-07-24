export const ORION_API_BASE =
  process.env.NEXT_PUBLIC_ORION_API_BASE || "http://127.0.0.1:8000";

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${ORION_API_BASE}${path}`);

  if (!response.ok) {
    throw new Error(`GET ${path} failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${ORION_API_BASE}${path}`, {
    method: "POST",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`POST ${path} failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}
