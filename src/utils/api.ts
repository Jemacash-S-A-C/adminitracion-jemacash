const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

// ── Token storage ─────────────────────────────────────────────────────────────

const KEYS = {
  ACCESS: 'jemacash.access_token',
  REFRESH: 'jemacash.refresh_token',
} as const

export function getAccessToken(): string | null {
  return localStorage.getItem(KEYS.ACCESS)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(KEYS.REFRESH)
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(KEYS.ACCESS, access)
  localStorage.setItem(KEYS.REFRESH, refresh)
}

export function clearTokens(): void {
  localStorage.removeItem(KEYS.ACCESS)
  localStorage.removeItem(KEYS.REFRESH)
}

// ── Error class ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number
  data?: unknown

  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

// ── Token refresh ─────────────────────────────────────────────────────────────

let refreshPromise: Promise<boolean> | null = null

async function doRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!res.ok) { clearTokens(); return false }
    const data = await res.json() as { access_token: string; refresh_token: string }
    setTokens(data.access_token, data.refresh_token)
    return true
  } catch {
    clearTokens()
    return false
  }
}

function tryRefresh(): Promise<boolean> {
  // De-duplicate concurrent refresh calls
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

// ── Core request ──────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
  isRetry = false,
): Promise<T> {
  const token = getAccessToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (res.status === 401 && !isRetry && token) {
    const refreshed = await tryRefresh()
    if (refreshed) return request<T>(path, options, true)
    clearTokens()
    window.dispatchEvent(new Event('auth:logout'))
    throw new ApiError(401, 'Sesión expirada. Por favor, inicia sesión de nuevo.')
  }

  if (!res.ok) {
    let msg = `Error ${res.status}`
    try {
      const body = await res.json() as { message?: string | string[] }
      const raw = body.message
      msg = Array.isArray(raw) ? raw.join(', ') : (raw ?? msg)
    } catch { /* ignore */ }
    throw new ApiError(res.status, msg)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ── Public API object ─────────────────────────────────────────────────────────

export const api = {
  get:    <T>(path: string)                  => request<T>(path, { method: 'GET' }),
  post:   <T>(path: string, body?: unknown)  => request<T>(path, { method: 'POST',  body: body != null ? JSON.stringify(body) : undefined }),
  patch:  <T>(path: string, body?: unknown)  => request<T>(path, { method: 'PATCH', body: body != null ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string)                  => request<T>(path, { method: 'DELETE' }),
}
