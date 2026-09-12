import type { TrainingProgram } from '#shared/types/api-tren'
import { createProgramDraft, type ProgramDraft } from '../model/form'

export function useProgramDraft(key: string, program?: TrainingProgram) {
  const draft = useState<ProgramDraft>(`program-draft:${key}`, () => createProgramDraft(program))
  const baseline = useState<string>(`program-draft-baseline:${key}`, () => JSON.stringify(draft.value))
  const isDirty = computed(() => JSON.stringify(draft.value) !== baseline.value)

  function reset(nextProgram?: TrainingProgram) {
    draft.value = createProgramDraft(nextProgram)
    baseline.value = JSON.stringify(draft.value)
  }

  function markSaved() {
    baseline.value = JSON.stringify(draft.value)
  }

  return { draft, isDirty, reset, markSaved }
}
