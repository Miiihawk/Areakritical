// A tiny shared fetch wrapper used by the feature's per-domain API files (reviewsApi, commentsApi,
// profileApi, reportsApi, adminApi). It captures the one piece of logic they all share — attach the
// bearer token, send JSON, and turn a non-OK response into a thrown ApiError carrying the server's
// { message } — so each domain file stays a thin list of endpoints (Constitution I: don't duplicate
// stateful logic). The pre-existing gamesApi/authApi keep their own copies; new code funnels here.

/** Thrown for any failed request. `message` is the user-facing text from the server, when available. */
export class ApiError extends Error {}

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

/**
 * Makes a request to an absolute API path (e.g. "/api/reviews/123") and returns the parsed JSON as
 * type T. A 204 No Content resolves to `undefined`. Any network or HTTP error becomes an ApiError.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Make sure the API is running.');
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message =
      errorBody && typeof errorBody.message === 'string' ? errorBody.message : 'Request failed.';
    throw new ApiError(message);
  }

  // 204 (e.g. delete/password-change) has no body to parse.
  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
