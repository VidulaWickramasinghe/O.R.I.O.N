import { runtimeConfig } from "@/lib/config/runtime";

export const ORION_API_BASE = runtimeConfig.apiBaseUrl;

export type ApiErrorShape = {
  status: number;
  code?: string;
  message: string;
  details?: unknown;
  requestId?: string;
  retryable: boolean;
};

export class ApiError extends Error implements ApiErrorShape {
  status: number;
  code?: string;
  details?: unknown;
  requestId?: string;
  retryable: boolean;

  constructor(error: ApiErrorShape) {
    super(error.message);
    this.name = "ApiError";
    this.status = error.status;
    this.code = error.code;
    this.details = error.details;
    this.requestId = error.requestId;
    this.retryable = error.retryable;
  }
}

export type ApiRequestOptions = Omit<RequestInit, "body" | "method"> & {
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  timeoutMs?: number;
};

function apiUrl(path: string, query?: ApiRequestOptions["query"]): string {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("O.R.I.O.N. API paths must be root-relative.");
  }
  const url = new URL(`${ORION_API_BASE}${path}`);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });
  return url.toString();
}

function defaultErrorMessage(status: number): string {
  if (status === 401) return "Authentication is required.";
  if (status === 403) return "Permission was denied or this action requires approval.";
  if (status === 404) return "The requested resource was not found.";
  if (status === 409) return "The resource changed state before the action completed.";
  if (status === 422) return "Some fields were rejected by backend validation.";
  if (status === 429) return "The backend request limit was reached.";
  if (status >= 500) return "The O.R.I.O.N. backend could not complete the request.";
  return "The backend rejected the request.";
}

async function responsePayload(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try { return await response.json(); } catch { return undefined; }
  }
  return response.text();
}

function errorFromResponse(response: Response, payload: unknown): ApiError {
  const object = payload && typeof payload === "object" ? payload as Record<string, unknown> : undefined;
  const detail = object?.detail;
  const message = typeof detail === "string"
    ? detail
    : typeof object?.message === "string"
      ? object.message
      : defaultErrorMessage(response.status);
  return new ApiError({
    status: response.status,
    code: typeof object?.code === "string" ? object.code : undefined,
    message,
    details: detail ?? payload,
    requestId: response.headers.get("x-request-id") ?? undefined,
    retryable: response.status === 408 || response.status === 429 || response.status >= 500,
  });
}

export async function apiRequest<T>(method: string, path: string, options: ApiRequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), options.timeoutMs ?? runtimeConfig.requestTimeoutMs);
  const externalSignal = options.signal;
  const abort = () => controller.abort(externalSignal?.reason);
  externalSignal?.addEventListener("abort", abort, { once: true });
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !isFormData && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  try {
    const body = options.body;
    const requestInit = { ...options };
    delete requestInit.body;
    delete requestInit.query;
    delete requestInit.timeoutMs;
    const response = await fetch(apiUrl(path, options.query), {
      ...(requestInit as RequestInit),
      method,
      headers,
      signal: controller.signal,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    });
    const payload = await responsePayload(response);
    if (!response.ok) throw errorFromResponse(response, payload);
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) {
      throw new ApiError({ status: 0, code: "REQUEST_ABORTED", message: "The request was cancelled or timed out.", details: error, retryable: true });
    }
    throw new ApiError({ status: 0, code: "BACKEND_OFFLINE", message: "The O.R.I.O.N. backend is unavailable.", details: error, retryable: true });
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", abort);
  }
}

export const apiGet = <T>(path: string, options?: ApiRequestOptions) => apiRequest<T>("GET", path, options);
export const apiPost = <T>(path: string, body?: unknown, options?: ApiRequestOptions) => apiRequest<T>("POST", path, { ...options, body });
export const apiPut = <T>(path: string, body?: unknown, options?: ApiRequestOptions) => apiRequest<T>("PUT", path, { ...options, body });
export const apiPatch = <T>(path: string, body?: unknown, options?: ApiRequestOptions) => apiRequest<T>("PATCH", path, { ...options, body });
export const apiDelete = <T>(path: string, options?: ApiRequestOptions) => apiRequest<T>("DELETE", path, options);

export function getValidationFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || error.status !== 422 || !Array.isArray(error.details)) return {};
  return Object.fromEntries(error.details.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const issue = item as { loc?: unknown[]; msg?: unknown };
    const field = issue.loc?.filter((part) => part !== "body").join(".");
    return field && typeof issue.msg === "string" ? [[field, issue.msg]] : [];
  }));
}
