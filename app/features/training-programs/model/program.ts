import type { Exercise, TrainingProgram, Weekday } from '#shared/types/api-tren'

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  1: 'Понедельник',
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
  6: 'Суббота',
  7: 'Воскресенье',
}

export const WEEKDAY_SHORT_LABELS: Record<Weekday, string> = {
  1: 'Пн',
  2: 'Вт',
  3: 'Ср',
  4: 'Чт',
  5: 'Пт',
  6: 'Сб',
  7: 'Вс',
}

export interface NextProgram {
  daysUntil: number
  program: TrainingProgram
}

export function sortProgramsByWeekday(programs: readonly TrainingProgram[]): TrainingProgram[] {
  return [...programs].sort((left, right) => left.weekday - right.weekday)
}

export function findNextProgram(
  currentWeekday: Weekday,
  programs: readonly TrainingProgram[],
): NextProgram | null {
  let result: NextProgram | null = null

  for (const program of programs) {
    const daysUntil = (program.weekday - currentWeekday + 7) % 7
    if (daysUntil === 0) continue
    if (!result || daysUntil < result.daysUntil) result = { daysUntil, program }
  }

  return result
}

export function getExerciseFallbackName(exerciseId: number): string {
  return `Упражнение №${exerciseId}`
}

export function ensureCurrentExerciseOption(
  exercises: readonly Exercise[],
  currentExerciseId: number | null,
): Exercise[] {
  if (currentExerciseId === null || exercises.some(exercise => exercise.id === currentExerciseId)) {
    return [...exercises]
  }
  return [
    { id: currentExerciseId, name: getExerciseFallbackName(currentExerciseId) },
    ...exercises,
  ]
}

export function formatExerciseCount(count: number): string {
  const lastTwoDigits = count % 100
  const lastDigit = count % 10
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return `${count} упражнений`
  if (lastDigit === 1) return `${count} упражнение`
  if (lastDigit >= 2 && lastDigit <= 4) return `${count} упражнения`
  return `${count} упражнений`
}
