import type {
  CreateTrainingProgramInput,
  DataEnvelope,
  TrainingProgram,
  UpdateTrainingProgramInput,
} from '#shared/types/api-tren'
import type { ApiRequestOptions } from '~/utils/api-client'

type Request = <T>(path: string, options?: ApiRequestOptions) => Promise<T>

export async function fetchTrainingPrograms(request: Request): Promise<TrainingProgram[]> {
  return (await request<DataEnvelope<TrainingProgram[]>>('/training-programs')).data
}

export async function createTrainingProgram(request: Request, input: CreateTrainingProgramInput): Promise<TrainingProgram> {
  return (await request<DataEnvelope<TrainingProgram>>('/training-programs', {
    method: 'POST',
    body: { ...input },
  })).data
}

export async function updateTrainingProgram(
  request: Request,
  programId: number,
  input: UpdateTrainingProgramInput,
): Promise<TrainingProgram> {
  return (await request<DataEnvelope<TrainingProgram>>(`/training-programs/${programId}`, {
    method: 'PUT',
    body: { ...input },
  })).data
}

export async function deleteTrainingProgram(request: Request, programId: number): Promise<void> {
  await request(`/training-programs/${programId}`, { method: 'DELETE' })
}
