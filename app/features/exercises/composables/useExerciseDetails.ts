import type { Exercise } from '#shared/types/api-tren'
import type { ApiError } from '~/utils/api-error'
import { useApiClient } from '~/utils/api-client'
import { fetchExercise } from '../api/exercises'

export function useExerciseDetails(exerciseId: () => number, open: () => boolean) {
  const { request } = useApiClient()
  const exercise = shallowRef<Exercise | null>(null)
  const loading = shallowRef(false)
  const error = shallowRef<ApiError | null>(null)
  let revision = 0

  async function load() {
    const current = ++revision
    exercise.value = null
    error.value = null
    loading.value = true
    try {
      const result = await fetchExercise(request, exerciseId())
      if (current === revision) exercise.value = result
    }
    catch (cause) {
      if (current === revision) error.value = cause as ApiError
    }
    finally {
      if (current === revision) loading.value = false
    }
  }

  watch([exerciseId, open], () => {
    if (open()) void load()
    else {
      revision++
      exercise.value = null
      error.value = null
      loading.value = false
    }
  }, { immediate: true })
  onScopeDispose(() => { revision++ })

  return { exercise, loading, error, load }
}
