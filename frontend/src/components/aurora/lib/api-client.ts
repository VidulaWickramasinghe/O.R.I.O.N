import { apiGet, apiPost } from "@/lib/api/client";

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const method = options.method || "GET";
  if (method === "GET") return apiGet<T>(path);
  return apiPost<T>(path, options.body);
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),

  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: "POST",
      body,
    }),
};
