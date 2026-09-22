import type { CreateTrainingProgramInput, TrainingProgram, UpdateTrainingProgramInput } from '#shared/types/api-tren'
import { createTrainingProgram, deleteTrainingProgram, fetchTrainingPrograms, updateTrainingProgram } from '../api/programs'
import { removeCachedProgram, upsertCachedProgram } from '../model/cache'
import { sortProgramsByWeekday } from '../model/program'
import type { ApiError } from '../model/errors'
import { useApiClient } from '~/utils/api-client'

export type QueryStatus = 'idle' | 'pending' | 'success' | 'error'

export function useTrainingPrograms() {
  const programs = useState<TrainingProgram[]>('training-programs', () => [])
  const status = useState<QueryStatus>('training-programs-status', () => 'idle')
  const error = useState<ApiError | null>('training-programs-error', () => null)
  const mutationPending = useState<boolean>('training-programs-mutation', () => false)
  const revision = useState<number>('training-programs-revision', () => 0)
  const { request } = useApiClient()

  async function load(force = false, background = false): Promise<boolean> {
    if (!force && (status.value === 'pending' || status.value === 'success')) return status.value === 'success'
    const version = ++revision.value
    const previousStatus = status.value
    if (!background) status.value = 'pending'
    error.value = null
    try {
      const fetched = await fetchTrainingPrograms(request)
      if (version !== revision.value) return false
      programs.value = sortProgramsByWeekday(fetched)
      status.value = 'success'
      return true
    }
    catch (cause) {
      if (version !== revision.value) return false
      error.value = cause as ApiError
      status.value = background && previousStatus === 'success' ? 'success' : 'error'
      return false
    }
  }

  async function runMutation<T>(operation: () => Promise<T>): Promise<T> {
    if (mutationPending.value) throw new Error('training_program_mutation_pending')
    mutationPending.value = true
    const wasLoading = status.value === 'pending'
    revision.value++
    try {
      const result = await operation()
      revision.value++
      error.value = null
      status.value = 'success'
      // A mutation response contains one program, not the superseded collection.
      if (wasLoading) await load(true)
      return result
    }
    catch (cause) {
      if (wasLoading) await load(true, true)
      throw cause
    }
    finally {
      mutationPending.value = false
    }
  }

  async function create(input: CreateTrainingProgramInput): Promise<TrainingProgram> {
    return runMutation(async () => {
      const program = await createTrainingProgram(request, input)
      programs.value = upsertCachedProgram(programs.value, program)
      return program
    })
  }

  async function update(programId: number, input: UpdateTrainingProgramInput): Promise<TrainingProgram> {
    return runMutation(async () => {
      const program = await updateTrainingProgram(request, programId, input)
      programs.value = upsertCachedProgram(programs.value, program)
      return program
    })
  }

  async function remove(programId: number): Promise<void> {
    if (mutationPending.value) throw new Error('training_program_mutation_pending')
    mutationPending.value = true
    try {
      try {
        await deleteTrainingProgram(request, programId)
      }
      catch (cause) {
        const mutationError = cause as ApiError
        await load(true, true)
        const deletionIsAuthoritative = status.value === 'success'
          && !programs.value.some(program => program.id === programId)
          && (mutationError.status === 0 || mutationError.status === 404 || mutationError.status >= 500)
        if (deletionIsAuthoritative) return
        throw cause
      }
      programs.value = removeCachedProgram(programs.value, programId)
      void load(true, true)
    }
    finally {
      mutationPending.value = false
    }
  }

  function findById(programId: number): TrainingProgram | null {
    return programs.value.find(program => program.id === programId) ?? null
  }

  return {
    programs: computed(() => programs.value),
    status: computed(() => status.value),
    error: computed(() => error.value),
    mutationPending: computed(() => mutationPending.value),
    load,
    create,
    update,
    remove,
    findById,
  }
}
