import { expect, it, vi } from 'vitest'
import { fetchWorkoutHistory } from './history'

it('uses cursor metadata without following upstream pagination URLs', async () => {
  const page = { data: [], links: { next: 'https://backend.test/api/workout-sessions', prev: null }, meta: { next_cursor: 'opaque+/=', prev_cursor: null, per_page: 15 } }
  const request = vi.fn().mockResolvedValue(page)
  await expect(fetchWorkoutHistory(request, 'opaque+/=')).resolves.toEqual(page)
  expect(request).toHaveBeenCalledWith('/workout-sessions', { query: { per_page: 15, cursor: 'opaque+/=' } })
})
