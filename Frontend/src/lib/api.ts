// ============================================================
// AI Commerce OS — API client
// Typed fetch wrapper that talks to the FastAPI backend.
// Handles JWT access/refresh tokens and camelCase JSON.
// ============================================================

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8000/api/v1";

const ACCESS_KEY = "cos_access_token";
const REFRESH_KEY = "cos_refresh_token";

// ── Token storage (localStorage; SSR-safe) ──────────────────
export const tokens = {
  access(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_KEY);
  },
  refresh(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean; // attach Authorization header (default true)
  // internal: prevents infinite refresh loops
  _retried?: boolean;
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = tokens.refresh();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    tokens.set(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, _retried = false } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const access = tokens.access();
  if (auth && access) headers["Authorization"] = `Bearer ${access}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Cannot reach the server. Is the backend running?", 0);
  }

  // Try a single token refresh on 401, then retry once.
  if (res.status === 401 && auth && !_retried) {
    const ok = await refreshAccessToken();
    if (ok) return request<T>(path, { ...opts, _retried: true });
    tokens.clear();
  }

  if (res.status === 204) return undefined as T;

  let payload: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    const detail =
      (payload && typeof payload === "object" && "detail" in payload
        ? (payload as { detail: unknown }).detail
        : payload) || res.statusText;
    throw new ApiError(
      typeof detail === "string" ? detail : JSON.stringify(detail),
      res.status
    );
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  // Unauthenticated POST (login/signup).
  postPublic: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body, auth: false }),
};

// Authenticated file download (CSV/ZIP). Fetches with the JWT, then triggers a
// browser save using the server's Content-Disposition filename.
export async function downloadFile(path: string): Promise<void> {
  const access = tokens.access();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: access ? { Authorization: `Bearer ${access}` } : {},
  });
  if (!res.ok) {
    throw new ApiError(`Download failed (${res.status})`, res.status);
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") || "";
  const match = /filename="?([^"]+)"?/.exec(cd);
  const filename = match ? match[1] : "export.csv";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
