import { createAnalysisCache, createAnalysisCacheState } from '../model/cache'
import { useApiClient } from '~/utils/api-client'
import { useTrainingPrograms } from '~/features/training-programs'

export function useAnalysisCache() {
  const state = useState('workout-analysis-cache', createAnalysisCacheState)
  const { request } = useApiClient()
  const programs = useTrainingPrograms()
  const cache = createAnalysisCache(state.value, request, () => programs.load(true, true))
  return {
    ...cache,
    acting: computed(() => state.value.acting),
    busy: computed(() => state.value.acting !== null || state.value.starting),
    lockStart() {
      if (state.value.acting !== null || state.value.starting) return false
      state.value.starting = true
      return true
    },
    unlockStart() { state.value.starting = false },
  }
}
