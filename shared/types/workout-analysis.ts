import type { PlannedSet } from './api-tren'

export type AnalysisStageStatus = 'pending' | 'processing' | 'completed' | 'failed'
export interface AnalysisMetric {
  planned: number
  actual: number
  difference: number
  percentage: number | null
}
export interface SetComparison {
  position: number
  planned: PlannedSet | null
  actual: PlannedSet | null
}
export interface AnalysisMetrics {
  sets: AnalysisMetric
  repetitions: AnalysisMetric
  volume_kg: AnalysisMetric
}
export interface ExerciseAnalysis extends AnalysisMetrics {
  exercise_id: number
  name: string
  position: number
  status: 'completed' | 'skipped'
  plan_fulfilled: boolean
  planned_sets: PlannedSet[]
  actual_sets: PlannedSet[]
  set_comparisons: SetComparison[]
}
export interface WorkoutAnalysisResult extends AnalysisMetrics {
  training_program_id: number
  program_name: string
  workout_completed_at: string
  completed_exercises: number
  skipped_exercises: number
  exercises: ExerciseAnalysis[]
}
export interface WorkoutRecommendation {
  id: number
  exercise_id: number
  change_type: 'progression' | 'adjustment' | 'replacement'
  replacement_exercise_id: number | null
  original_sets: PlannedSet[]
  proposed_sets: PlannedSet[]
  rationale: string
  status: 'proposed' | 'applied' | 'rejected' | 'expired'
  applied_at: string | null
  rejected_at: string | null
  expired_at: string | null
  evidence: unknown
}
export interface RecommendationGeneration {
  status: AnalysisStageStatus
  failure_code: string | null
  no_change_reason: string | null
  rejected_reasons: unknown
  items: WorkoutRecommendation[] | null
}
export interface WorkoutAnalysis {
  id: number
  workout_session_id: number
  status: AnalysisStageStatus
  overall_status: AnalysisStageStatus
  failure_code: string | null
  result: WorkoutAnalysisResult | null
  ai_analysis: {
    status: AnalysisStageStatus
    failure_code: string | null
    result: { current_workout: string, history: string } | null
  } | null
  recommendation_generation: RecommendationGeneration | null
}
