export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface DataEnvelope<T> {
  data: T
}

export interface Exercise {
  id: number
  code: string
  name: string
  description: string | null
  video_url: string | null
}

export interface PlannedSet {
  position: number
  repetitions: number
  working_weight_kg: number
}

export interface PlannedSetInput {
  repetitions: number
  working_weight_kg: number
}

export interface PlannedExercise {
  exercise_id: number
  position: number
  sets: PlannedSet[]
}

export interface PlannedExerciseInput {
  exercise_id: number
  sets: PlannedSetInput[]
}

export interface TrainingProgram {
  id: number
  weekday: Weekday
  name: string
  exercises: PlannedExercise[]
}

export interface CreateTrainingProgramInput {
  weekday: Weekday
  name: string
  exercises: PlannedExerciseInput[]
}

export interface UpdateTrainingProgramInput {
  weekday?: Weekday
  name: string
  exercises: PlannedExerciseInput[]
}

export type WorkoutSessionStatus = 'in_progress' | 'completed' | 'cancelled'
export type WorkoutExerciseStatus = 'pending' | 'completed' | 'skipped'

export interface ReplaceWorkoutExerciseInput {
  request_id: string
  replacement_exercise_id: number
  replace_in_plan: boolean
  sets: PlannedSetInput[]
}

export interface EffectiveWorkoutExercise {
  exercise_id: number
  name: string
  planned_sets: PlannedSet[]
}

export interface WorkoutExercise {
  exercise_id: number
  name: string
  position: number
  status: WorkoutExerciseStatus
  // Optional for compatibility with sessions from older API deployments.
  effective_exercise?: EffectiveWorkoutExercise
  replacement?: { request_id: string, replace_in_plan: boolean } | null
  included_in_analysis?: boolean
  planned_sets: PlannedSet[]
  sets: PlannedSet[]
}

export interface WorkoutSession {
  id: number
  training_program_id: number
  program_name: string
  scheduled_weekday: Weekday
  status: WorkoutSessionStatus
  started_at: string
  completed_at: string | null
  cancelled_at: string | null
  exercises: WorkoutExercise[]
}

export interface AuthResponse {
  token: string
  token_type: 'Bearer'
}

export interface WorkoutHistoryPage {
  data: WorkoutSession[]
  links: { prev: string | null, next: string | null }
  meta: { per_page: number, prev_cursor: string | null, next_cursor: string | null }
}

export interface DomainErrorResponse {
  code: string
  message: string
}

export interface ValidationErrorResponse {
  message: string
  errors: Record<string, string[]>
}
