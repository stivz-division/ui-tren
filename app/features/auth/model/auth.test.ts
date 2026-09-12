import { describe, expect, it, vi } from 'vitest'
import { createAuthCoordinator, createAuthorizedRequest } from './auth'

describe('auth coordinator', () => {
  it('deduplicates concurrent Telegram authentication', async () => {
    const authenticate = vi.fn(async () => ({ authenticated: true }))
    const coordinator = createAuthCoordinator(authenticate)

    await Promise.all([coordinator.authenticate(), coordinator.authenticate()])

    expect(authenticate).toHaveBeenCalledOnce()
  })

  it('reauthenticates and retries a protected request only once', async () => {
    const request = vi.fn()
      .mockRejectedValueOnce({ statusCode: 401 })
      .mockResolvedValueOnce({ data: 'ok' })
    const reauthenticate = vi.fn().mockResolvedValue(undefined)
    const authorizedRequest = createAuthorizedRequest(request, reauthenticate)

    await expect(authorizedRequest('/training-programs')).resolves.toEqual({ data: 'ok' })
    expect(reauthenticate).toHaveBeenCalledOnce()
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('does not enter a retry loop after a second 401', async () => {
    const request = vi.fn().mockRejectedValue({ statusCode: 401 })
    const reauthenticate = vi.fn().mockResolvedValue(undefined)
    const authorizedRequest = createAuthorizedRequest(request, reauthenticate)

    await expect(authorizedRequest('/training-programs')).rejects.toMatchObject({ statusCode: 401 })
    expect(reauthenticate).toHaveBeenCalledOnce()
    expect(request).toHaveBeenCalledTimes(2)
  })
})
