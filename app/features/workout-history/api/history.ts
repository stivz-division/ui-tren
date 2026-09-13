import type { WorkoutHistoryPage } from '#shared/types/api-tren'
import type { ApiRequestOptions } from '~/utils/api-client'
type Request = <T>(path: string, options?: ApiRequestOptions) => Promise<T>

export function fetchWorkoutHistory(request: Request, cursor?: string): Promise<WorkoutHistoryPage> {
  return request('/workout-sessions', { query: { per_page: 15, ...(cursor ? { cursor } : {}) } })
}
