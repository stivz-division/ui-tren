import type { MaybeRefOrGetter } from 'vue'
import { useAnalysisCache } from './useAnalysisCache'
import { shouldPollAnalysis } from '../model/stages'
import { useAuth } from '~/features/auth/composables/useAuth'

export function useWorkoutAnalysis(sessionId: MaybeRefOrGetter<number | null>) {
  const cache = useAnalysisCache()
  const auth = useAuth()
  const current = computed(() => {
    const id = toValue(sessionId)
    return id ? cache.entry(id) : null
  })
  let timer: ReturnType<typeof setTimeout> | undefined
  let interval = 4000
  let mounted = false
  function clearTimer() { clearTimeout(timer); timer = undefined }
  const canRead = () => mounted && document.visibilityState !== 'hidden' && auth.status.value === 'authenticated'
  async function refresh() {
    const id = toValue(sessionId)
    if (!id || cache.busy.value || current.value?.loading || !canRead()) return
    await cache.load(id, true)
  }
  function schedule() {
    clearTimer()
    const value = current.value
    if (!canRead() || cache.busy.value || value?.loading || value?.error || value?.unavailable || !shouldPollAnalysis(value?.data ?? null)) return
    timer = setTimeout(async () => {
      interval = Math.min(interval * 1.5, 20000)
      await refresh()
      schedule()
    }, interval)
  }
  function resume() {
    clearTimer()
    if (canRead()) { interval = 4000; void refresh().then(schedule) }
  }
  watch([() => toValue(sessionId), auth.status], resume)
  watch(cache.busy, (busy) => { if (!busy) resume() })
  watch([current, cache.busy], schedule, { deep: true })
  onMounted(() => { mounted = true; document.addEventListener('visibilitychange', resume); resume() })
  onScopeDispose(() => {
    clearTimer()
    if (mounted) document.removeEventListener('visibilitychange', resume)
    mounted = false
  })
  return { ...cache, current, refresh }
}
