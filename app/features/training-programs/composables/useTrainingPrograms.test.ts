// @vitest-environment nuxt
import { beforeEach, expect, it, vi } from 'vitest'
import { clearNuxtState } from '#app'
import { useTrainingPrograms } from './useTrainingPrograms'

const { request } = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('~/utils/api-client', () => ({ useApiClient: () => ({ request }) }))

beforeEach(() => { clearNuxtState(); request.mockReset() })

it('settles a superseded initial read after creating a program', async () => {
  let resolve!: (value: unknown) => void
  request.mockReturnValueOnce(new Promise(done => { resolve = done }))
  const programs = useTrainingPrograms()
  const reading = programs.load()
  const created = { id: 1, weekday: 1, name: 'Новая программа', exercises: [] }
  const existing = { id: 2, weekday: 2, name: 'Существующая программа', exercises: [] }
  request.mockResolvedValueOnce({ data: created }).mockResolvedValueOnce({ data: [created, existing] })
  await programs.create({ weekday: 1, name: 'Новая программа', exercises: [] })
  resolve({ data: [] })
  await reading
  expect(programs.status.value).toBe('success')
  expect(programs.findById(1)).toEqual(created)
  expect(programs.findById(2)).toEqual(existing)
})

it('does not stay pending after a forced background refresh supersedes a failed foreground read', async () => {
  let resolve!: (value: unknown) => void
  request.mockReturnValueOnce(new Promise(done => { resolve = done }))
  const programs = useTrainingPrograms()
  const reading = programs.load()
  request.mockRejectedValueOnce({ status: 0 })
  expect(await programs.load(true, true)).toBe(false)
  resolve({ data: [] })
  await reading
  expect(programs.status.value).toBe('error')
})
