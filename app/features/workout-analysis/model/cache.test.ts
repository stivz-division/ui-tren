import { describe, expect, it, vi } from 'vitest'
import { createAnalysisCache, createAnalysisCacheState } from './cache'
import { analysisFixture, recommendationFixture } from '../../../../tests/fixtures/analysis'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}
function setup() {
  const state = createAnalysisCacheState()
  const request = vi.fn().mockResolvedValue({ data: analysisFixture() })
  const refresh = vi.fn().mockResolvedValue(true)
  const cache = createAnalysisCache(state, request, refresh)
  return { state, request, refresh, cache }
}

describe('shared analysis cache', () => {
  it.each(['apply', 'reject'] as const)('accepts authoritative %s response, blocks duplicate taps and stale reads', async (action) => {
    const { cache, request, refresh } = setup()
    await cache.load(9)
    const oldRead = deferred<unknown>()
    const mutation = deferred<unknown>()
    request.mockReturnValueOnce(oldRead.promise).mockReturnValueOnce(mutation.promise)
    const reading = cache.load(9, true)
    const acting = cache.act(9, 31, action)
    await cache.act(9, 31, action)
    expect(request).toHaveBeenCalledTimes(3)
    expect(cache.entry(9).data?.recommendation_generation?.items?.[0]?.status).toBe('proposed')
    mutation.resolve({ data: { ...recommendationFixture(), status: action === 'apply' ? 'applied' : 'rejected' } })
    await acting
    oldRead.resolve({ data: analysisFixture() })
    await reading
    expect(cache.entry(9).data?.recommendation_generation?.items?.[0]?.status).toBe(action === 'apply' ? 'applied' : 'rejected')
    expect(refresh).toHaveBeenCalledTimes(action === 'apply' ? 1 : 0)
    expect(request).toHaveBeenCalledWith(`/workout-recommendations/31/${action}`, { method: 'POST' })
    expect(cache.entry(9).data?.result?.exercises[0]?.planned_sets[0]?.working_weight_kg).toBe(40)
  })
  it.each([0, 409, 500])('reconciles uncertain/conflicting action (%s) before allowing retry', async (status) => {
    const { cache, request, refresh } = setup()
    await cache.load(9)
    request.mockRejectedValueOnce({ status }).mockResolvedValueOnce({ data: analysisFixture() })
    await cache.act(9, 31, 'apply')
    expect(request.mock.calls.map(call => call[0])).toEqual(['/workout-sessions/9/analysis', '/workout-recommendations/31/apply', '/workout-sessions/9/analysis'])
    expect(refresh).toHaveBeenCalledOnce()
    expect(cache.entry(9).notice).not.toContain('Изменения применены')
    expect(cache.entry(9).uncertain).toBe(false)
  })
  it('keeps actions locked if reconciliation fails until an explicit read succeeds', async () => {
    const { cache, request } = setup()
    await cache.load(9)
    request.mockRejectedValue({ status: 0 })
    await cache.act(9, 31, 'apply')
    expect(cache.entry(9).uncertain).toBe(true)
    const count = request.mock.calls.length
    await cache.act(9, 31, 'apply')
    expect(request).toHaveBeenCalledTimes(count)
    request.mockResolvedValue({ data: analysisFixture() })
    await cache.load(9, true)
    expect(cache.entry(9).uncertain).toBe(false)
  })
  it('treats 404 as unavailable and clears old actions', async () => {
    const { cache, request } = setup()
    await cache.load(9)
    request.mockRejectedValue({ status: 404 })
    await cache.load(9, true)
    expect(cache.entry(9).unavailable).toBe(true)
    expect(cache.entry(9).data).toBeNull()
  })
  it.each(['applied', 'rejected', 'expired'] as const)('does not act on %s recommendations', async (status) => {
    const { cache, request } = setup()
    const data = analysisFixture()
    data.recommendation_generation!.items![0]!.status = status
    request.mockResolvedValue({ data })
    await cache.load(9)
    await cache.act(9, 31, 'apply')
    expect(request).toHaveBeenCalledOnce()
  })
  it('invalidates program analyses after start, hiding proposed actions even if refresh fails', async () => {
    const { cache, request } = setup()
    await cache.load(9)
    cache.invalidateProgram(1)
    expect(cache.entry(9).stale).toBe(true)
    await cache.act(9, 31, 'apply')
    expect(request).toHaveBeenCalledOnce()
  })
})
