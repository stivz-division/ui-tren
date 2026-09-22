import type { DataEnvelope } from '#shared/types/api-tren'
import type { WorkoutAnalysis, WorkoutRecommendation } from '#shared/types/workout-analysis'
import type { ApiRequestOptions } from '~/utils/api-client'

export type AnalysisRequest = <T>(path: string, options?: ApiRequestOptions) => Promise<T>
export type RecommendationAction = 'apply' | 'reject'

export async function fetchWorkoutAnalysis(request: AnalysisRequest, sessionId: number): Promise<WorkoutAnalysis> {
  return (await request<DataEnvelope<WorkoutAnalysis>>(`/workout-sessions/${sessionId}/analysis`)).data
}
export async function actOnRecommendation(request: AnalysisRequest, id: number, action: RecommendationAction): Promise<WorkoutRecommendation> {
  return (await request<DataEnvelope<WorkoutRecommendation>>(`/workout-recommendations/${id}/${action}`, { method: 'POST' })).data
}
