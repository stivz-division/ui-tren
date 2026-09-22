import { describe, expect, it } from 'vitest'
import { shouldPollAnalysis, stageMessage, compareSets, formatAnalysisNumber } from './stages'
import type { WorkoutAnalysis } from '#shared/types/workout-analysis'

const analysis = (value: Partial<WorkoutAnalysis> = {}): WorkoutAnalysis => ({
  id: 1, workout_session_id: 9, status: 'completed', overall_status: 'completed', failure_code: null,
  result: null, ai_analysis: { status: 'completed', failure_code: null, result: null },
  recommendation_generation: { status: 'completed', failure_code: null, items: [], no_change_reason: 'План подходит', rejected_reasons: null }, ...value,
})

describe('independent analysis stages', () => {
  it.each(['pending', 'processing'] as const)('polls unfinished %s stages even after comparison completes', (status) => {
    expect(shouldPollAnalysis(analysis({ status }))).toBe(true)
    expect(shouldPollAnalysis(analysis({ ai_analysis: { status, failure_code: null, result: null } }))).toBe(true)
    expect(shouldPollAnalysis(analysis({ recommendation_generation: { status, failure_code: null, items: null, no_change_reason: null, rejected_reasons: null } }))).toBe(true)
  })
  it('waits for absent downstream stages only while the chain is expected', () => {
    expect(shouldPollAnalysis(analysis({ overall_status: 'processing', ai_analysis: null, recommendation_generation: null }))).toBe(true)
    expect(shouldPollAnalysis(analysis({ status: 'failed', overall_status: 'failed', ai_analysis: null, recommendation_generation: null }))).toBe(false)
    expect(shouldPollAnalysis(analysis({ overall_status: 'failed', ai_analysis: { status: 'failed', failure_code: 'x', result: null }, recommendation_generation: null }))).toBe(false)
    expect(shouldPollAnalysis(analysis())).toBe(false)
    expect(shouldPollAnalysis(null)).toBe(false)
  })
  it('does not describe unavailable stages as processing', () => {
    expect(stageMessage('pending')).toBe('Ожидает обработки')
    expect(stageMessage('processing')).toBe('Подготавливаем…')
    expect(stageMessage(null, true)).toBe('Недоступно: предыдущий этап завершился ошибкой')
    expect(stageMessage(null)).toBe('Этап ещё не создан')
  })
  it('preserves kg, nullable percentages and missing set sides', () => {
    expect(formatAnalysisNumber(42.5)).toBe('42,5')
    expect(formatAnalysisNumber(null)).toBe('—')
    expect(compareSets([{ position: 2, repetitions: 8, working_weight_kg: 42.5 }], [{ position: 1, repetitions: 10, working_weight_kg: 40 }])).toEqual([
      { position: 1, planned: null, actual: { position: 1, repetitions: 10, working_weight_kg: 40 } },
      { position: 2, planned: { position: 2, repetitions: 8, working_weight_kg: 42.5 }, actual: null },
    ])
  })
})
