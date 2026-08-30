import { apiGet, apiPost, apiRequest } from "@/lib/api/client";

export { apiRequest };

export const api = {
  get: <T>(path: string) => apiGet<T>(path),
  post: <T>(path: string, body?: unknown) => apiPost<T>(path, body),
};
