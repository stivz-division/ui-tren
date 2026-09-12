import type { DataEnvelope, Exercise } from '#shared/types/api-tren'
import type { ApiRequestOptions } from '~/utils/api-client'

type Request = <T>(path: string, options?: ApiRequestOptions) => Promise<T>

export async function fetchExerciseCatalog(request: Request): Promise<Exercise[]> {
  return (await request<DataEnvelope<Exercise[]>>('/exercises')).data
}
