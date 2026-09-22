// @vitest-environment nuxt
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { clearNuxtState, useState } from '#app'
import { defineComponent } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useAnalysisCache } from './useAnalysisCache'
import { useWorkoutAnalysis } from './useWorkoutAnalysis'
import { useWorkoutPreparation } from '~/composables/useWorkoutPreparation'
import { analysisFixture } from '../../../../tests/fixtures/analysis'

const { request } = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('~/utils/api-client', () => ({ useApiClient: () => ({ request }) }))
enableAutoUnmount(afterEach)
afterEach(() => { vi.useRealTimers() })

beforeEach(() => {
  clearNuxtState()
  request.mockReset()
  useState('auth-status').value = 'authenticated'
})

it('loads an uncached analysis after a shared action lock is released', async () => {
  const cache = useAnalysisCache()
  cache.lockStart()
  request.mockResolvedValue({ data: analysisFixture() })
  const wrapper = await mountSuspended(defineComponent({ setup() { useWorkoutAnalysis(9); return () => null } }))
  expect(request).not.toHaveBeenCalled()
  cache.unlockStart()
  await vi.waitFor(() => expect(cache.entry(9).data?.id).toBe(1))
  wrapper.unmount()
})

it('resumes the preparation check after a shared action lock is released', async () => {
  const cache = useAnalysisCache()
  cache.lockStart()
  request.mockImplementation((path: string) => Promise.resolve(path === '/workout-sessions/active' ? { data: null } : { data: [], meta: { next_cursor: null } }))
  let preparation!: ReturnType<typeof useWorkoutPreparation>
  const wrapper = await mountSuspended(defineComponent({ setup() { preparation = useWorkoutPreparation(1); void preparation.inspect(); return () => null } }))
  expect(request).not.toHaveBeenCalled()
  cache.unlockStart()
  await vi.waitFor(() => expect(preparation.checking.value).toBe(false))
  expect(preparation.activeChecked.value).toBe(true)
  expect(preparation.blocked.value).toBe(false)
  wrapper.unmount()
})

it('stops polling in hidden tabs and after leaving the screen, and resumes on visibility', async () => {
  vi.useFakeTimers()
  const fixture = analysisFixture()
  fixture.overall_status = 'processing'
  fixture.recommendation_generation!.status = 'processing'
  fixture.recommendation_generation!.items = null
  request.mockResolvedValue({ data: fixture })
  const wrapper = await mountSuspended(defineComponent({ setup() { useWorkoutAnalysis(9); return () => null } }))
  await vi.advanceTimersByTimeAsync(0)
  expect(request).toHaveBeenCalledTimes(1)
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  document.dispatchEvent(new Event('visibilitychange'))
  await vi.advanceTimersByTimeAsync(60000)
  expect(request).toHaveBeenCalledTimes(1)
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  document.dispatchEvent(new Event('visibilitychange'))
  await vi.advanceTimersByTimeAsync(0)
  expect(request).toHaveBeenCalledTimes(2)
  wrapper.unmount()
  await vi.advanceTimersByTimeAsync(60000)
  expect(request).toHaveBeenCalledTimes(2)
  vi.useRealTimers()
})

it('stops polling on transport errors until a user refresh', async () => {
  vi.useFakeTimers()
  const fixture = analysisFixture()
  fixture.status = 'processing'
  request.mockResolvedValueOnce({ data: fixture }).mockRejectedValue({ status: 503 })
  const wrapper = await mountSuspended(defineComponent({ setup() { useWorkoutAnalysis(9); return () => null } }))
  await vi.advanceTimersByTimeAsync(5000)
  expect(request).toHaveBeenCalledTimes(2)
  await vi.advanceTimersByTimeAsync(60000)
  expect(request).toHaveBeenCalledTimes(2)
  wrapper.unmount()
  vi.useRealTimers()
})
