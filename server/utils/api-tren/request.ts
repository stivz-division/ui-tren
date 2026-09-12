import type { H3Event } from 'h3'

const SESSION_COOKIE = 'api_tren_session'

export function getApiTrenToken(event: H3Event): string {
  const token = getCookie(event, SESSION_COOKIE)
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Unauthenticated' })
  return token
}

export function setApiTrenToken(event: H3Event, token: string): void {
  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
}

export function clearApiTrenToken(event: H3Event): void {
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}

export function safeUpstreamData(value: unknown, status: number): unknown {
  if (status >= 500 || !value || typeof value !== 'object') return undefined
  const data = value as Record<string, unknown>
  return {
    code: typeof data.code === 'string' ? data.code : undefined,
    errors: status === 422 && typeof data.errors === 'object' ? data.errors : undefined,
  }
}
