import { describe, expect, it } from 'vitest'
import { isAllowedApiRequest, resolveAuthInitData } from './paths'

describe('API Tren proxy allowlist', () => {
  it.each([
    ['GET', 'training-programs'],
    ['POST', 'training-programs'],
    ['PUT', 'training-programs/42'],
    ['DELETE', 'training-programs/42'],
    ['GET', 'training-programs/weekdays/7'],
    ['GET', 'exercises'],
    ['GET', 'workout-sessions/active'],
    ['PUT', 'workout-sessions/active'],
    ['GET', 'workout-sessions'],
    ['PUT', 'workout-sessions/9/exercises/10/sets'],
    ['POST', 'workout-sessions/9/exercises/10/complete'],
    ['POST', 'workout-sessions/9/exercises/10/skip'],
    ['POST', 'workout-sessions/9/exercises/10/reopen'],
    ['POST', 'workout-sessions/9/complete'],
    ['POST', 'workout-sessions/9/cancel'],
  ])('allows %s %s', (method, path) => {
    expect(isAllowedApiRequest(method, path)).toBe(true)
  })

  it.each([
    ['GET', 'https://attacker.test'],
    ['GET', '../secrets'],
    ['POST', 'exercises'],
    ['PATCH', 'training-programs/1'],
    ['GET', 'training-programs/1/delete'],
    ['POST', 'workout-sessions'],
    ['GET', 'workout-sessions/9/cancel'],
    ['PUT', 'workout-sessions/9/exercises/10/complete'],
    ['POST', 'workout-sessions/9/exercises/10/sets'],
    ['POST', 'workout-sessions/9/exercises/10/delete'],
  ])('rejects %s %s', (method, path) => {
    expect(isAllowedApiRequest(method, path)).toBe(false)
  })

  it('uses the server Telegram fixture only in the local environment', () => {
    expect(resolveAuthInitData('browser-data', {
      appEnv: 'local',
      telegramInitData: 'server-local-data',
    })).toBe('server-local-data')

    expect(resolveAuthInitData('browser-data', {
      appEnv: 'production',
      telegramInitData: 'server-local-data',
    })).toBe('browser-data')

    expect(resolveAuthInitData('browser-data', {
      appEnv: 'local',
      telegramInitData: '   ',
    })).toBe('browser-data')
  })
})
