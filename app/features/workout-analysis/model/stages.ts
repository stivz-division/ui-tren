import type { PlannedSet } from '#shared/types/api-tren'
import type { AnalysisStageStatus, SetComparison, WorkoutAnalysis } from '#shared/types/workout-analysis'

const unfinished = (status?: AnalysisStageStatus) => status === 'pending' || status === 'processing'

export function shouldPollAnalysis(analysis: WorkoutAnalysis | null): boolean {
  if (!analysis) return false
  if ([analysis.status, analysis.ai_analysis?.status, analysis.recommendation_generation?.status].some(unfinished)) return true
  if (analysis.overall_status === 'completed' || analysis.overall_status === 'failed') return false
  if (analysis.status === 'failed' || analysis.ai_analysis?.status === 'failed') return false
  return !analysis.ai_analysis || !analysis.recommendation_generation
}

export function stageMessage(status: AnalysisStageStatus | null | undefined, blocked = false): string {
  if (status === 'pending') return 'Ожидает обработки'
  if (status === 'processing') return 'Подготавливаем…'
  if (status === 'failed') return 'Не удалось подготовить результат'
  if (status === 'completed') return 'Результат пока недоступен'
  return blocked ? 'Недоступно: предыдущий этап завершился ошибкой' : 'Этап ещё не создан'
}

const formatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })
export function formatAnalysisNumber(value: number | null): string {
  return value === null ? '—' : formatter.format(value)
}

export function compareSets(planned: PlannedSet[], actual: PlannedSet[]): SetComparison[] {
  const before = new Map(planned.map(set => [set.position, set]))
  const after = new Map(actual.map(set => [set.position, set]))
  return [...new Set([...before.keys(), ...after.keys()])].sort((a, b) => a - b)
    .map(position => ({ position, planned: before.get(position) ?? null, actual: after.get(position) ?? null }))
}
