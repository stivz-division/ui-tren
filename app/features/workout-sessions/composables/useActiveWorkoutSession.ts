import type { WorkoutSession } from '#shared/types/api-tren'
import { fetchActiveWorkoutSession, startWorkoutSession } from '../api/sessions'
import type { ApiError } from '~/features/training-programs/model/errors'
import { useApiClient } from '~/utils/api-client'

export function useActiveWorkoutSession() {
  const session = useState<WorkoutSession | null>('active-workout-session', () => null)
  const pending = useState<boolean>('active-workout-session-pending', () => false)
  const { request } = useApiClient()

  async function start(programId: number): Promise<WorkoutSession> {
    if (pending.value) throw new Error('workout_session_mutation_pending')
    pending.value = true
    try {
      session.value = await startWorkoutSession(request, programId)
      return session.value
    }
    catch (cause) {
      const error = cause as ApiError
      if (error.code === 'active_workout_session_already_exists') {
        session.value = await fetchActiveWorkoutSession(request)
        if (session.value) return session.value
      }
      throw cause
    }
    finally {
      pending.value = false
    }
  }

  return { session: computed(() => session.value), pending: computed(() => pending.value), start }
}
