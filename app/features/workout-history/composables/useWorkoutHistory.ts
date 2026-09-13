import { useAuth } from '~/features/auth/composables/useAuth'
import type { WorkoutSession } from '#shared/types/api-tren'
import type { ApiError } from '~/utils/api-error'
import { useApiClient } from '~/utils/api-client'
import { fetchWorkoutHistory } from '../api/history'

export function useWorkoutHistory() {
  const { request } = useApiClient()
  const sessions = ref<WorkoutSession[]>([])
  const nextCursor = shallowRef<string | null>(null)
  const loading = shallowRef(false)
  const loaded = shallowRef(false)
  const error = ref<ApiError | null>(null)
  async function load(more = false) {
    if (loading.value || (more && !nextCursor.value)) return
    loading.value = true
    error.value = null
    try {
      const page = await fetchWorkoutHistory(request, more ? nextCursor.value! : undefined)
      const records = more ? [...sessions.value, ...page.data] : page.data
      sessions.value = [...new Map(records.map(session => [session.id, session])).values()]
      nextCursor.value = page.meta.next_cursor
      loaded.value = true
    }
    catch (cause) { error.value = cause as ApiError }
    finally { loading.value = false }
  }
  const { status: authStatus } = useAuth()
  watch(authStatus, (status) => { if (status === 'authenticated' && !loaded.value) void load() }, { immediate: true })
  return { sessions, nextCursor, loading, loaded, error, load }
}
