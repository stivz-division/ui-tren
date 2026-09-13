import type { WorkoutExerciseStatus } from '#shared/types/api-tren'

export const EXERCISE_STATUS: Record<WorkoutExerciseStatus, { label: string, icon: string, color: 'neutral' | 'success' | 'warning' }> = {
  pending: { label: 'Не завершено', icon: 'i-lucide-circle', color: 'neutral' },
  completed: { label: 'Завершено', icon: 'i-lucide-check', color: 'success' },
  skipped: { label: 'Пропущено', icon: 'i-lucide-skip-forward', color: 'warning' },
}
