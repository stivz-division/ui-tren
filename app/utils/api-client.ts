import { useAuth } from '~/features/auth/composables/useAuth'
import { createAuthorizedRequest } from '~/features/auth/model/auth'
import { normalizeApiError } from '~/utils/api-error'
import { logger } from '~/utils/logger'

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: Record<string, unknown>
  query?: Record<string, string | number | boolean | undefined>
}

export function useApiClient() {
  const { reauthenticate } = useAuth()
  const request = createAuthorizedRequest(
    (path, options) => $fetch(path, options as ApiRequestOptions),
    reauthenticate,
  )

  return {
    async request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
      logger.debug('api.request.started', { method: options.method ?? 'GET', path })
      try {
        const result = await request(`/api/api-tren${path}`, options as Record<string, unknown>)
        logger.debug('api.request.completed', { method: options.method ?? 'GET', path })
        return result as T
      }
      catch (error) {
        const normalized = normalizeApiError(error)
        logger.warn('api.request.failed', { path, method: options.method ?? 'GET', status: normalized.status, code: normalized.code })
        throw normalized
      }
    },
  }
}
