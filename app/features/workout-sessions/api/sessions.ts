import type { DataEnvelope, WorkoutSession } from '#shared/types/api-tren'
import type { ApiRequestOptions } from '~/utils/api-client'

type Request = <T>(path: string, options?: ApiRequestOptions) => Promise<T>

export async function startWorkoutSession(request: Request, trainingProgramId: number): Promise<WorkoutSession> {
  return (await request<DataEnvelope<WorkoutSession>>('/workout-sessions/active', {
    method: 'PUT',
    body: { training_program_id: trainingProgramId },
  })).data
}

export async function fetchActiveWorkoutSession(request: Request): Promise<WorkoutSession | null> {
  return (await request<DataEnvelope<WorkoutSession | null>>('/workout-sessions/active')).data
}
