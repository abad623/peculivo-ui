const BASE_URL = "https://api.peculivo.com/v1";

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

async function authFetch(path: string, body: object): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `Error ${res.status}`);
  }

  return res.json();
}

export function register(email: string, password: string, full_name?: string, language?: string) {
  return authFetch("/auth/register", {
    email,
    password,
    full_name,
    options: { data: { language: language || "en" } },
  });
}

export function login(email: string, password: string) {
  return authFetch("/auth/login", { email, password });
}

export function refreshToken(refresh_token: string) {
  return authFetch("/auth/refresh", { refresh_token });
}

export async function logout(accessToken: string) {
  await fetch(`${BASE_URL}/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
