import { expect, it, vi } from 'vitest'
import { fetchWorkoutHistory, findLatestProgramSession } from './history'
import type { WorkoutSession } from '#shared/types/api-tren'

it('uses cursor metadata without following upstream pagination URLs', async () => {
  const page = { data: [], links: { next: 'https://backend.test/api/workout-sessions', prev: null }, meta: { next_cursor: 'opaque+/=', prev_cursor: null, per_page: 15 } }
  const request = vi.fn().mockResolvedValue(page)
  await expect(fetchWorkoutHistory(request, 'opaque+/=')).resolves.toEqual(page)
  expect(request).toHaveBeenCalledWith('/workout-sessions', { query: { per_page: 15, cursor: 'opaque+/=' } })
})

it('finds the program on later cursor pages without a program filter', async () => {
  const session = { id: 9, training_program_id: 1, status: 'completed' } as WorkoutSession
  const request = vi.fn().mockResolvedValueOnce({ data: [{ ...session, training_program_id: 2 }], meta: { next_cursor: 'page2' } }).mockResolvedValueOnce({ data: [session], meta: { next_cursor: null } })
  expect(await findLatestProgramSession(request, 1)).toEqual(session)
  expect(request).toHaveBeenLastCalledWith('/workout-sessions', { query: { per_page: 15, cursor: 'page2' } })
})

it('stops at the latest cancelled session instead of reviving old recommendations', async () => {
  const session = { id: 10, training_program_id: 1, status: 'cancelled' } as WorkoutSession
  const request = vi.fn().mockResolvedValue({ data: [session, { ...session, id: 9, status: 'completed' }], meta: { next_cursor: 'older' } })
  expect(await findLatestProgramSession(request, 1)).toEqual(session)
  expect(request).toHaveBeenCalledOnce()
})
