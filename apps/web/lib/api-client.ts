/**
 * Typed HTTP client that wraps fetch.
 * - Base path: /api/v1 (proxied to FastAPI via Next.js rewrites)
 * - Includes credentials for cookie-based auth
 * - 401 → single-flight refresh → retry once
 * - Parses the API error envelope into ApiError
 */

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId?: string;
  status: number;
}

class ApiErrorClass extends Error implements ApiError {
  code: string;
  details?: Record<string, unknown>;
  requestId?: string;
  status: number;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiError';
    this.code = error.code;
    this.details = error.details;
    this.requestId = error.requestId;
    this.status = error.status;
  }
}

// Single-flight refresh — one promise shared across all concurrent 401s
let refreshPromise: Promise<void> | null = null;

async function refreshToken(): Promise<void> {
  const res = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok)
    throw new ApiErrorClass({ code: 'REFRESH_FAILED', message: 'Session expired', status: 401 });
}

async function request<T>(
  method: string,
  path: string,
  options: {
    body?: unknown;
    idempotencyKey?: string;
    signal?: AbortSignal;
    retry?: boolean;
  } = {}
): Promise<T> {
  const { body, idempotencyKey, signal, retry = true } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const res = await fetch(`/api/v1${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
    signal,
  });

  if (res.status === 401 && retry) {
    // Coalesce concurrent refreshes into one request
    if (!refreshPromise) {
      refreshPromise = refreshToken().finally(() => {
        refreshPromise = null;
      });
    }
    await refreshPromise;
    // Retry once after successful refresh
    return request<T>(method, path, { ...options, retry: false });
  }

  if (!res.ok) {
    let errorBody: { error?: Partial<ApiError> } = {};
    try {
      errorBody = await res.json();
    } catch {
      // Body may not be JSON (e.g., 502 from proxy)
    }
    throw new ApiErrorClass({
      code: errorBody.error?.code ?? 'UNKNOWN_ERROR',
      message: errorBody.error?.message ?? `HTTP ${res.status}`,
      details: errorBody.error?.details,
      requestId: res.headers.get('X-Request-ID') ?? undefined,
      status: res.status,
    });
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string, options?: { signal?: AbortSignal }) =>
    request<T>('GET', path, options),
  post: <T>(
    path: string,
    body?: unknown,
    options?: { idempotencyKey?: string; signal?: AbortSignal }
  ) => request<T>('POST', path, { body, ...options }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T>(path: string) => request<T>('DELETE', path),
  isApiError: (e: unknown): e is ApiErrorClass => e instanceof ApiErrorClass,
};
