import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { createApp, createEvent, defineEventHandler, toWebHandler } from 'h3'
import { describe, expect, it } from 'vitest'
import middleware from '../../middleware/api-csrf'

function invoke(path: string, method: string, headers: Record<string, string> = {}) {
  const req = new IncomingMessage(new Socket())
  req.url = path
  req.method = method
  req.headers = { host: 'mini.example', 'x-forwarded-proto': 'https', ...headers }
  return middleware(createEvent(req, new ServerResponse(req)))
}

describe('BFF CSRF boundary', () => {
  it.each(['/api/%61uth', '/%61pi/auth', '/api/%61pi-tren/training-programs'])('checks the decoded route used by h3: %s', async (path) => {
    const app = createApp()
    app.use(middleware)
    app.use(defineEventHandler(() => ({ reachedHandler: true })))
    const handler = toWebHandler(app)
    const response = await handler(new Request(`https://mini.example${path}`, {
      method: 'POST', headers: { origin: 'https://attacker.example' },
    }))
    expect(response.status).toBe(403)
  })

  for (const [path, method] of [
    ['/api/auth', 'POST'],
    ['/api/api-tren/training-programs', 'POST'],
    ['/api/api-tren/training-programs/1', 'PUT'],
    ['/api/api-tren/training-programs/1', 'DELETE'],
    ['/api/api-tren/workout-sessions/1/complete', 'POST'],
  ]) {
    it(`rejects a cross-origin form and missing header: ${method} ${path}`, () => {
      expect(() => invoke(path!, method!, { origin: 'https://attacker.example' })).toThrowError()
      expect(() => invoke(path!, method!, { origin: 'https://mini.example' })).toThrowError()
    })
    it(`allows same-origin iframe fetch: ${method} ${path}`, () => {
      expect(() => invoke(path!, method!, {
        origin: 'https://mini.example', 'sec-fetch-site': 'same-origin', 'x-ui-tren-request': '1',
      })).not.toThrow()
    })
  }

  it.each(['https://attacker.example', 'null', 'https://mini.example.attacker.example'])('rejects foreign/opaque Origin %s even with the header', (origin) => {
    expect(() => invoke('/api/auth', 'POST', { origin, 'x-ui-tren-request': '1' })).toThrowError()
  })

  it('rejects cross-site metadata and preflight without allowing CORS', () => {
    expect(() => invoke('/api/auth', 'POST', { 'sec-fetch-site': 'cross-site', 'x-ui-tren-request': '1' })).toThrowError()
    expect(() => invoke('/api/auth', 'OPTIONS', { origin: 'https://attacker.example' })).toThrowError()
  })

  it('supports older webviews without metadata when the custom header is present', () => {
    expect(() => invoke('/api/auth', 'POST', { 'x-ui-tren-request': '1' })).not.toThrow()
  })

  it('does not affect reads or non-BFF paths', () => {
    expect(() => invoke('/api/api-tren/exercises', 'GET')).not.toThrow()
    expect(() => invoke('/programs', 'GET')).not.toThrow()
  })
})
