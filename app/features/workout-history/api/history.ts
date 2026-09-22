import type { WorkoutHistoryPage, WorkoutSession } from '#shared/types/api-tren'
import type { ApiRequestOptions } from '~/utils/api-client'
type Request = <T>(path: string, options?: ApiRequestOptions) => Promise<T>

export function fetchWorkoutHistory(request: Request, cursor?: string): Promise<WorkoutHistoryPage> {
  return request('/workout-sessions', { query: { per_page: 15, ...(cursor ? { cursor } : {}) } })
}

export async function findLatestProgramSession(request: Request, programId: number, cancelled: () => boolean = () => false): Promise<WorkoutSession | null> {
  let cursor: string | undefined
  const seen = new Set<string>()
  do {
    if (cancelled()) throw new Error('history_search_cancelled')
    const page = await fetchWorkoutHistory(request, cursor)
    const latest = page.data.find(session => session.training_program_id === programId)
    if (latest) return latest
    cursor = page.meta.next_cursor ?? undefined
    if (cursor && seen.has(cursor)) throw new Error('history_cursor_repeated')
    if (cursor) seen.add(cursor)
  } while (cursor)
  return null
}
