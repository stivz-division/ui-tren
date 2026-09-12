import type { TrainingProgram, Weekday } from '#shared/types/api-tren'
import type { NextProgram } from './program'
import { findNextProgram } from './program'

export type HomeState =
  | { kind: 'workout', today: TrainingProgram, next: NextProgram | null }
  | { kind: 'rest', next: NextProgram | null }

export function buildHomeState(currentWeekday: Weekday, programs: readonly TrainingProgram[]): HomeState {
  const today = programs.find(program => program.weekday === currentWeekday)
  const next = findNextProgram(currentWeekday, programs)
  return today ? { kind: 'workout', today, next } : { kind: 'rest', next }
}
