import type { Exercise } from '#shared/types/api-tren'
import { fetchExerciseCatalog } from '../api/exercises'
import type { ApiError } from '../model/errors'
import { getExerciseFallbackName } from '../model/program'
import { useApiClient } from '~/utils/api-client'

export type CatalogStatus = 'idle' | 'pending' | 'success' | 'unavailable' | 'error'

export function useExerciseCatalog() {
  const exercises = useState<Exercise[]>('exercise-catalog', () => [])
  const status = useState<CatalogStatus>('exercise-catalog-status', () => 'idle')
  const error = useState<ApiError | null>('exercise-catalog-error', () => null)
  const { request } = useApiClient()

  async function load(force = false): Promise<void> {
    if (status.value === 'pending' || (status.value === 'success' && !force)) return
    status.value = 'pending'
    try {
      exercises.value = await fetchExerciseCatalog(request)
      status.value = 'success'
      error.value = null
    }
    catch (cause) {
      error.value = cause as ApiError
      status.value = error.value.status === 404 ? 'unavailable' : 'error'
    }
  }

  function getName(exerciseId: number): string {
    return exercises.value.find(exercise => exercise.id === exerciseId)?.name ?? getExerciseFallbackName(exerciseId)
  }

  return {
    exercises: computed(() => exercises.value),
    status: computed(() => status.value),
    error: computed(() => error.value),
    load,
    getName,
  }
}
