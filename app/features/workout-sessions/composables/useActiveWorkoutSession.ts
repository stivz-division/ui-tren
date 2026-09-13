import type { WorkoutSession } from '#shared/types/api-tren'
import { fetchActiveWorkoutSession, startWorkoutSession } from '../api/sessions'
import type { ApiError } from '~/utils/api-error'
import { useApiClient } from '~/utils/api-client'

export function useActiveWorkoutSession() {
  const session = useState<WorkoutSession | null>('active-workout-session', () => null)
  const pending = useState<boolean>('active-workout-session-pending', () => false)
  const loading = useState<boolean>('active-workout-session-loading', () => false)
  const loaded = useState<boolean>('active-workout-session-loaded', () => false)
  const error = useState<ApiError | null>('active-workout-session-error', () => null)
  const revision = useState<number>('active-workout-session-revision', () => 0)
  const { request } = useApiClient()

  function accept(value: WorkoutSession | null) {
    revision.value++
    session.value = value?.status === 'in_progress' ? value : null
    loaded.value = true
  }
  async function load(): Promise<boolean> {
    if (loading.value || pending.value) return false
    loading.value = true
    error.value = null
    const version = revision.value
    try {
      const value = await fetchActiveWorkoutSession(request)
      if (version === revision.value) accept(value)
      return true
    }
    catch (cause) { error.value = cause as ApiError; return false }
    finally { loading.value = false }
  }
  async function mutate(operation: () => Promise<WorkoutSession>): Promise<WorkoutSession> {
    if (pending.value) throw new Error('workout_session_mutation_pending')
    pending.value = true
    revision.value++
    try {
      const value = await operation()
      accept(value)
      return value
    }
    finally { pending.value = false }
  }
  async function start(programId: number): Promise<WorkoutSession> {
    try { return await mutate(() => startWorkoutSession(request, programId)) }
    catch (cause) {
      const failure = cause as ApiError
      if (failure.code === 'active_workout_session_already_exists') {
        await load()
        if (session.value) return session.value
      }
      throw cause
    }
  }
  return { session: computed(() => session.value), pending: computed(() => pending.value), loading: computed(() => loading.value), loaded: computed(() => loaded.value), error: computed(() => error.value), load, start, mutate }
}
