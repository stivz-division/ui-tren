import type { H3Event } from 'h3'
import { createError, deleteCookie, getCookie, getRequestProtocol, getResponseHeader, setCookie, setResponseHeader } from 'h3'

const SESSION_COOKIE = 'api_tren_session'

function sessionCookieOptions(event: H3Event) {
  // TLS may terminate at the reverse proxy, which must overwrite X-Forwarded-Proto.
  const secure = getRequestProtocol(event) === 'https'
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' as const : 'lax' as const,
    partitioned: secure,
    path: '/',
  }
}

export function getApiTrenToken(event: H3Event): string {
  const token = getCookie(event, SESSION_COOKIE)
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Unauthenticated' })
  return token
}

export function setApiTrenToken(event: H3Event, token: string): void {
  setCookie(event, SESSION_COOKIE, token, sessionCookieOptions(event))
  clearLegacySession(event)
}

export function clearApiTrenToken(event: H3Event): void {
  deleteCookie(event, SESSION_COOKIE, sessionCookieOptions(event))
  clearLegacySession(event)
}

function clearLegacySession(event: H3Event): void {
  if (getRequestProtocol(event) !== 'https') return
  // h3 1.x deduplicates Set-Cookie by name/domain/path, ignoring Partitioned.
  // Expire legacy state first, so browsers ignoring Partitioned keep the new cookie.
  const cookies = getResponseHeader(event, 'set-cookie')
  setResponseHeader(event, 'set-cookie', [
    `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`,
    ...(Array.isArray(cookies) ? cookies : [String(cookies)]),
  ])
}

export function safeUpstreamData(value: unknown, status: number): unknown {
  if (status >= 500 || !value || typeof value !== 'object') return undefined
  const data = value as Record<string, unknown>
  return {
    code: typeof data.code === 'string' ? data.code : undefined,
    errors: status === 422 && typeof data.errors === 'object' ? data.errors : undefined,
  }
}
