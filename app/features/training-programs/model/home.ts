import type { TrainingProgram, Weekday } from '#shared/types/api-tren'
import type { NextPrograms } from './program'
import { findNextPrograms } from './program'

export type HomeState =
  | { kind: 'workout', today: TrainingProgram[], next: NextPrograms | null }
  | { kind: 'rest', next: NextPrograms | null }

export function buildHomeState(currentWeekday: Weekday, programs: readonly TrainingProgram[]): HomeState {
  const today = programs.filter(program => program.weekday === currentWeekday)
  const next = findNextPrograms(currentWeekday, programs)
  return today.length > 0 ? { kind: 'workout', today, next } : { kind: 'rest', next }
}
