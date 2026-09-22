import { describe, expect, it, vi } from 'vitest'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import * as h3 from 'h3'
import { clearApiTrenToken, safeUpstreamData, setApiTrenToken } from './request'

function cookieEvent(https: boolean) {
  const req = new IncomingMessage(new Socket())
  req.headers = { host: 'mini.example', ...(https ? { 'x-forwarded-proto': 'https' } : {}) }
  return h3.createEvent(req, new ServerResponse(req))
}

describe('session cookie policy', () => {
  // Use real h3 serialization, including the expiry header sent to the browser.
  it('allows HTTPS iframe sessions and clears the same partitioned cookie', () => {
    const event = cookieEvent(true)
    setApiTrenToken(event, 'test-session')
    const cookie = String(event.node.res.getHeader('set-cookie'))
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=None')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('Partitioned')
    expect(cookie).toContain('Path=/')
    // An existing mobile/top-level Lax cookie must not shadow the new partitioned one.
    const headers = event.node.res.getHeader('set-cookie') as string[]
    expect(headers).toContain('api_tren_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax')
    expect(headers.at(-1)).toContain('api_tren_session=test-session;')
    clearApiTrenToken(event)
    const cleared = String(event.node.res.getHeader('set-cookie'))
    expect(cleared).toContain('Max-Age=0')
    expect(cleared).toContain('SameSite=None')
    expect(cleared).toContain('Secure')
    expect(cleared).toContain('Partitioned')
  })

  it('keeps plain HTTP development usable even in a production build', () => {
    vi.stubEnv('NODE_ENV', 'production')
    try {
      const event = cookieEvent(false)
      setApiTrenToken(event, 'test-session')
      const cookie = String(event.node.res.getHeader('set-cookie'))
      expect(cookie).toContain('SameSite=Lax')
      expect(cookie).not.toContain('Secure')
      expect(cookie).not.toContain('Partitioned')
      clearApiTrenToken(event)
      expect(String(event.node.res.getHeader('set-cookie'))).toContain('SameSite=Lax')
    }
    finally { vi.unstubAllEnvs() }
  })
})

describe('safeUpstreamData', () => {
  it('keeps only actionable validation fields for client errors', () => {
    expect(safeUpstreamData({
      code: 'exercise_not_found',
      message: 'Internal model details',
      errors: { 'exercises.0.exercise_id': ['Unknown exercise'] },
    }, 422)).toEqual({
      code: 'exercise_not_found',
      errors: { 'exercises.0.exercise_id': ['Unknown exercise'] },
    })
  })

  it('does not expose upstream details for server failures', () => {
    expect(safeUpstreamData({
      code: 'internal_error',
      message: 'SQLSTATE connection secret',
      errors: { trace: ['sensitive stack'] },
    }, 500)).toBeUndefined()
  })
})
