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
  const { request } = useApiClient()

  async function load(force = false): Promise<void> {
    if (status.value === 'pending' || (status.value === 'success' && !force)) return
    status.value = 'pending'
    error.value = null
    try {
      programs.value = sortProgramsByWeekday(await fetchTrainingPrograms(request))
      status.value = 'success'
    }
    catch (cause) {
      error.value = cause as ApiError
      status.value = 'error'
    }
  }

  async function runMutation<T>(operation: () => Promise<T>): Promise<T> {
    if (mutationPending.value) throw new Error('training_program_mutation_pending')
    mutationPending.value = true
    try {
      return await operation()
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
    await runMutation(() => deleteTrainingProgram(request, programId))
    programs.value = removeCachedProgram(programs.value, programId)
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
