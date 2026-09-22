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
    await expect(authorizedRequest('/exercises')).rejects.toMatchObject({ statusCode: 401 })
    expect(reauthenticate).toHaveBeenCalledOnce()
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('shares recovery even when another old request returns 401 after recovery finished', async () => {
    const late = Promise.withResolvers<unknown>()
    const request = vi.fn()
      .mockRejectedValueOnce({ statusCode: 401 })
      .mockReturnValueOnce(late.promise)
      .mockResolvedValue({ data: 'ok' })
    const reauthenticate = vi.fn().mockResolvedValue(undefined)
    const authorized = createAuthorizedRequest(request, reauthenticate)
    const first = authorized('/training-programs')
    const second = authorized('/exercises')
    await first
    late.reject({ statusCode: 401 })
    await expect(second).resolves.toEqual({ data: 'ok' })
    expect(reauthenticate).toHaveBeenCalledOnce()
  })

  it('shares a failed recovery and blocks subsequent automatic logins', async () => {
    const request = vi.fn().mockRejectedValue({ statusCode: 401 })
    const reauthenticate = vi.fn().mockRejectedValue({ statusCode: 429 })
    const authorized = createAuthorizedRequest(request, reauthenticate)
    await Promise.allSettled([authorized('/training-programs'), authorized('/exercises')])
    await expect(authorized('/workout-sessions/active')).rejects.toMatchObject({ statusCode: 429 })
    expect(reauthenticate).toHaveBeenCalledOnce()
  })

  it('does not automatically replay a mutation after recovery', async () => {
    const request = vi.fn().mockRejectedValue({ statusCode: 401 })
    const reauthenticate = vi.fn().mockResolvedValue(undefined)
    const authorized = createAuthorizedRequest(request, reauthenticate)
    await expect(authorized('/training-programs', { method: 'POST', body: {} })).rejects.toMatchObject({ statusCode: 401 })
    expect(request).toHaveBeenCalledOnce()
  })

  it('does not recover validation, conflict or transport failures', async () => {
    for (const statusCode of [409, 422, 429, 500]) {
      const request = vi.fn().mockRejectedValue({ statusCode })
      const reauthenticate = vi.fn()
      await expect(createAuthorizedRequest(request, reauthenticate)('/programs')).rejects.toMatchObject({ statusCode })
      expect(reauthenticate).not.toHaveBeenCalled()
    }
  })

  it('shares simultaneous recovery and waits before starting new reads', async () => {
    const recovery = Promise.withResolvers<undefined>()
    const request = vi.fn()
      .mockRejectedValueOnce({ statusCode: 401 })
      .mockRejectedValueOnce({ statusCode: 401 })
      .mockResolvedValue({ data: 'ok' })
    const reauthenticate = vi.fn(() => recovery.promise)
    const authorized = createAuthorizedRequest(request, reauthenticate)
    const first = authorized('/programs')
    const second = authorized('/exercises')
    await vi.waitFor(() => expect(reauthenticate).toHaveBeenCalledOnce())
    const third = authorized('/active')
    expect(request).toHaveBeenCalledTimes(2)
    recovery.resolve(undefined)
    expect(await Promise.all([first, second, third])).toEqual([{ data: 'ok' }, { data: 'ok' }, { data: 'ok' }])
  })

  it('reports terminal failure once and permits recovery again only after explicit reset', async () => {
    const request = vi.fn().mockRejectedValue({ statusCode: 401 })
    const onFailure = vi.fn()
    const reauthenticate = vi.fn().mockResolvedValue(undefined)
    const authorized = createAuthorizedRequest(request, reauthenticate, onFailure)
    await Promise.allSettled([authorized('/programs'), authorized('/exercises')])
    expect(onFailure).toHaveBeenCalledOnce()
    authorized.reset()
    await expect(authorized('/programs')).rejects.toMatchObject({ statusCode: 401 })
    expect(reauthenticate).toHaveBeenCalledTimes(2)
  })
})
