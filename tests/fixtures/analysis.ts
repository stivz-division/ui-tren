import type { WorkoutAnalysis, WorkoutRecommendation } from '../../shared/types/workout-analysis'

export function recommendationFixture(): WorkoutRecommendation {
  return {
    id: 31, exercise_id: 10, change_type: 'progression', replacement_exercise_id: null,
    original_sets: [{ position: 1, repetitions: 10, working_weight_kg: 40 }],
    proposed_sets: [{ position: 1, repetitions: 10, working_weight_kg: 42.5 }, { position: 2, repetitions: 8, working_weight_kg: 40 }],
    rationale: 'Можно постепенно увеличить нагрузку.', status: 'proposed', applied_at: null, rejected_at: null, expired_at: null, evidence: [],
  }
}
export function analysisFixture(): WorkoutAnalysis {
  const metrics = {
    sets: { planned: 1, actual: 1, difference: 0, percentage: 0 },
    repetitions: { planned: 10, actual: 10, difference: 0, percentage: 0 },
    volume_kg: { planned: 400, actual: 400, difference: 0, percentage: null },
  }
  const sets = recommendationFixture().original_sets
  return {
    id: 1, workout_session_id: 9, status: 'completed', overall_status: 'completed', failure_code: null,
    result: { ...metrics, training_program_id: 1, program_name: 'Силовая тренировка', workout_completed_at: '2026-09-13T11:00:00Z', completed_exercises: 1, skipped_exercises: 0,
      exercises: [{ ...metrics, exercise_id: 10, name: 'Жим лёжа', position: 1, status: 'completed', plan_fulfilled: false, planned_sets: sets, actual_sets: sets, set_comparisons: [{ position: 1, planned: sets[0]!, actual: sets[0]! }] }] },
    ai_analysis: { status: 'completed', failure_code: null, result: { current_workout: 'Текущая тренировка.\n\nСохраняйте технику.', history: 'Это первая тренировка в истории.' } },
    recommendation_generation: { status: 'completed', failure_code: null, no_change_reason: null, rejected_reasons: [], items: [recommendationFixture()] },
  }
}
