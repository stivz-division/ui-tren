import type { MaybeRefOrGetter } from 'vue'
import { useActiveWorkoutSession } from '~/features/workout-sessions'
import { useTrainingPrograms } from '~/features/training-programs'
import { useAnalysisCache, shouldPollAnalysis } from '~/features/workout-analysis'
import { findLatestProgramSession } from '~/features/workout-history'
import { useApiClient } from '~/utils/api-client'
import type { ApiError } from '~/utils/api-error'

/** Coordinates features; creation remains behind the recommendation decision. */
export function useWorkoutPreparation(programId: MaybeRefOrGetter<number>) {
  const active = useActiveWorkoutSession()
  const programs = useTrainingPrograms()
  const cache = useAnalysisCache()
  const { request } = useApiClient()
  const sessionId = shallowRef<number | null>(null)
  const checking = shallowRef(true)
  const activeChecked = shallowRef(false)
  const error = shallowRef<string | null>(null)
  const confirmationOpen = shallowRef(false)
  const starting = shallowRef(false)
  let disposed = false
  let generation = 0
  onScopeDispose(() => { disposed = true; generation++ })
  const analysis = computed(() => sessionId.value ? cache.entry(sessionId.value) : null)
  const proposed = computed(() => analysis.value?.data?.recommendation_generation?.items?.some(item => item.status === 'proposed') ?? false)
  const incomplete = computed(() => {
    const entry = analysis.value
    if (error.value || entry?.error || entry?.unavailable || entry?.stale) return true
    if (!entry) return false
    const data = entry.data
    return !data || shouldPollAnalysis(data) || data.recommendation_generation?.status !== 'completed' || data.recommendation_generation.items === null
  })
  const blocked = computed(() => checking.value || !activeChecked.value || cache.busy.value || programs.mutationPending.value || active.loading.value || active.pending.value)
  watch(cache.busy, (busy) => {
    if (!busy && checking.value && !activeChecked.value && !disposed) void inspect()
  })

  async function inspect() {
    if (cache.busy.value) return
    const version = ++generation
    checking.value = true
    error.value = null
    sessionId.value = null
    activeChecked.value = false
    try {
      const loaded = await active.load()
      if (disposed || version !== generation) return
      if (!loaded) { error.value = 'Не удалось проверить активную тренировку. Повторите проверку перед стартом.'; return }
      activeChecked.value = true
      if (active.session.value) return
      const latest = await findLatestProgramSession(request, toValue(programId), () => disposed || version !== generation)
      if (disposed || version !== generation) return
      if (latest?.status !== 'completed') return
      sessionId.value = latest.id
      cache.entry(latest.id).programId = toValue(programId)
      await cache.load(latest.id, true)
    }
    catch {
      if (!disposed && version === generation) error.value = 'Не удалось загрузить рекомендации. Повторите загрузку или явно начните с текущим планом.'
    }
    finally { if (version === generation) checking.value = false }
  }

  async function start(confirmed = false) {
    if (blocked.value || starting.value) return
    if (proposed.value && !confirmed) { confirmationOpen.value = true; return }
    if (!cache.lockStart()) return
    starting.value = true
    error.value = null
    try {
      // Recheck active state immediately before creation, including another tab/device.
      if (!await active.load()) {
        activeChecked.value = false
        error.value = 'Не удалось проверить активную тренировку. Повторите проверку перед стартом.'
        return
      }
      if (active.session.value) { await navigateTo('/workout-session', { replace: true }); return }
      if (!await programs.load(true, true)) {
        error.value = 'Не удалось обновить программу. Повторите загрузку перед стартом.'
        return
      }
      const session = await active.start(toValue(programId))
      cache.invalidateProgram(session.training_program_id)
      confirmationOpen.value = false
      await navigateTo('/workout-session', { replace: true })
    }
    catch (cause) {
      if ((cause as ApiError).status === 404) {
        await programs.load(true, true)
        await navigateTo('/programs', { replace: true })
        return
      }
      await active.load()
      if (active.session.value) cache.invalidateProgram(active.session.value.training_program_id)
      error.value = active.session.value
        ? 'Тренировка уже активна. Можно продолжить её.'
        : 'Не удалось подтвердить начало тренировки. Проверьте соединение и повторите проверку.'
    }
    finally { cache.unlockStart(); starting.value = false }
  }
  return { active, sessionId, checking, activeChecked, error, confirmationOpen, starting, blocked, incomplete, inspect, start, cache }
}
