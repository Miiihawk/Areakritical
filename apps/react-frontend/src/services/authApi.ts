const API_BASE_URL = '/api/auth';

export class AuthApiError extends Error {}

export type RegisterResponse = {
  id: string;
  email: string;
  role: 'Admin' | 'Author';
};

export type LoginResponse = {
  token: string;
  role: 'Admin' | 'Author';
  expiresAtUtc: string;
};

async function request<TResponse>(
  path: string,
  options: { method: string; body?: unknown; token?: string | null },
): Promise<TResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new AuthApiError('Cannot reach the server. Make sure the API is running.');
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message =
      errorBody && typeof errorBody.message === 'string'
        ? errorBody.message
        : 'Request failed.';
    throw new AuthApiError(message);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

function register(email: string, password: string): Promise<RegisterResponse> {
  return request<RegisterResponse>('/register', { method: 'POST', body: { email, password } });
}

function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/login', { method: 'POST', body: { email, password } });
}

function logout(token: string): Promise<void> {
  return request<void>('/logout', { method: 'POST', token });
}

export const authApi = { request, register, login, logout };
