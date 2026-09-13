import type { DataEnvelope, PlannedSetInput, WorkoutSession } from '#shared/types/api-tren'
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

export type ExerciseAction = 'complete' | 'skip' | 'reopen'
export type SessionAction = 'complete' | 'cancel'

export async function saveExerciseSets(request: Request, sessionId: number, exerciseId: number, sets: PlannedSetInput[]): Promise<WorkoutSession> {
  return (await request<DataEnvelope<WorkoutSession>>(`/workout-sessions/${sessionId}/exercises/${exerciseId}/sets`, {
    method: 'PUT', body: { sets },
  })).data
}

export async function changeWorkoutExercise(request: Request, sessionId: number, exerciseId: number, action: ExerciseAction, sets: PlannedSetInput[] = []): Promise<WorkoutSession> {
  return (await request<DataEnvelope<WorkoutSession>>(`/workout-sessions/${sessionId}/exercises/${exerciseId}/${action}`, {
    method: 'POST', ...(action === 'complete' ? { body: { sets } } : {}),
  })).data
}

export async function finishWorkoutSession(request: Request, sessionId: number, action: SessionAction): Promise<WorkoutSession> {
  return (await request<DataEnvelope<WorkoutSession>>(`/workout-sessions/${sessionId}/${action}`, { method: 'POST' })).data
}
