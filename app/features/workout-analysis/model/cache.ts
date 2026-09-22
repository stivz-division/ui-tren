import type { WorkoutAnalysis } from '#shared/types/workout-analysis'
import { actOnRecommendation, fetchWorkoutAnalysis, type AnalysisRequest, type RecommendationAction } from '../api/analysis'
import type { ApiError } from '~/utils/api-error'

export interface AnalysisCacheEntry {
  data: WorkoutAnalysis | null
  programId: number | null
  revision: number
  loading: boolean
  unavailable: boolean
  stale: boolean
  uncertain: boolean
  error: string | null
  notice: string | null
  noticeIsError: boolean
}
export interface AnalysisCacheState {
  entries: Record<number, AnalysisCacheEntry>
  acting: number | null
  starting: boolean
}
export function createAnalysisCacheState(): AnalysisCacheState {
  return { entries: {}, acting: null, starting: false }
}

/** State is Nuxt useState-owned; no user data or promises live at module scope. */
export function createAnalysisCache(state: AnalysisCacheState, request: AnalysisRequest, refreshPrograms: () => Promise<boolean>) {
  function entry(id: number): AnalysisCacheEntry {
    return state.entries[id] ??= {
      data: null, programId: null, revision: 0, loading: false, unavailable: false,
      stale: false, uncertain: false, error: null, notice: null, noticeIsError: false,
    }
  }

  async function load(id: number, force = false): Promise<boolean> {
    const target = entry(id)
    if (!force && (target.loading || (target.data && !target.stale) || target.unavailable)) return false
    const revision = ++target.revision
    target.loading = true
    target.error = null
    try {
      const data = await fetchWorkoutAnalysis(request, id)
      if (revision !== target.revision) return false
      target.data = data
      target.programId = data.result?.training_program_id ?? target.programId
      target.unavailable = false
      target.stale = false
      target.uncertain = false
      return true
    }
    catch (cause) {
      if (revision !== target.revision) return false
      const failure = cause as ApiError
      target.unavailable = failure.status === 404
      if (target.unavailable) target.data = null
      else target.error = 'Не удалось загрузить анализ. Проверьте соединение и повторите загрузку.'
      return false
    }
    finally { if (revision === target.revision) target.loading = false }
  }

  async function act(sessionId: number, recommendationId: number, action: RecommendationAction): Promise<void> {
    const target = entry(sessionId)
    const item = target.data?.recommendation_generation?.items?.find(item => item.id === recommendationId)
    if (state.acting !== null || state.starting || target.stale || target.uncertain || item?.status !== 'proposed') return
    state.acting = recommendationId
    target.revision++ // Reads begun before the decision cannot overwrite its authoritative response.
    target.loading = false
    target.notice = null
    target.noticeIsError = false
    try {
      const updated = await actOnRecommendation(request, recommendationId, action)
      target.revision++
      const generation = target.data?.recommendation_generation
      if (generation?.items) generation.items = generation.items.map(value => value.id === updated.id ? updated : value)
      target.notice = action === 'apply' ? 'Изменения применены к программе' : 'Рекомендация отклонена'
      if (action === 'apply' && !await refreshPrograms()) {
        target.notice += '. Не удалось обновить программу — перечитайте её перед стартом.'
        target.noticeIsError = true
      }
    }
    catch (cause) {
      const failure = cause as ApiError
      const needsReconcile = failure.status === 0 || failure.status === 409 || failure.status >= 500
      target.noticeIsError = true
      if (needsReconcile) {
        target.uncertain = true
        await Promise.all([load(sessionId, true), refreshPrograms()])
        target.notice = failure.status === 409
          ? 'Рекомендация уже обработана или больше не актуальна. Данные обновлены; проверьте её статус.'
          : 'Не удалось подтвердить результат действия. Состояние перечитано; если предложение ещё доступно, можно повторить действие.'
        if (target.uncertain) target.notice = 'Не удалось проверить результат действия. Обновите анализ перед повтором.'
      }
      else target.notice = 'Не удалось выполнить действие. Обновите анализ и попробуйте снова.'
    }
    finally { state.acting = null }
  }

  function invalidateProgram(programId: number) {
    for (const target of Object.values(state.entries)) {
      if (target.programId !== programId) continue
      target.revision++
      target.loading = false
      target.stale = true
    }
  }

  return { entry, load, act, invalidateProgram }
}
