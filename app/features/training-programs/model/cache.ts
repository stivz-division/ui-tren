import type { TrainingProgram } from '#shared/types/api-tren'
import { sortProgramsByWeekday } from './program'

export function upsertCachedProgram(
  programs: readonly TrainingProgram[],
  program: TrainingProgram,
): TrainingProgram[] {
  return sortProgramsByWeekday([...programs.filter(item => item.id !== program.id), program])
}

export function removeCachedProgram(programs: readonly TrainingProgram[], programId: number): TrainingProgram[] {
  return programs.filter(program => program.id !== programId)
}
