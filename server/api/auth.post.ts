import type { AuthResponse } from '#shared/types/api-tren'
import { resolveAuthInitData } from '../utils/api-tren/paths'
import { safeUpstreamData, setApiTrenToken } from '../utils/api-tren/request'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ init_data?: unknown }>(event)
  const clientInitData = typeof body?.init_data === 'string' ? body.init_data : ''
  const config = useRuntimeConfig(event)
  const initData = resolveAuthInitData(clientInitData, {
    appEnv: config.appEnv,
    telegramInitData: config.telegramInitData,
  })

  if (!initData || initData.length > 10_240) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid authentication data' })
  }

  try {
    const response = await $fetch<AuthResponse>('/auth', {
      baseURL: config.apiBase,
      method: 'POST',
      body: { init_data: initData },
    })
    setApiTrenToken(event, response.token)
    setResponseHeader(event, 'cache-control', 'no-store')
    return { authenticated: true }
  }
  catch (error) {
    const upstream = error as { response?: { status?: number, _data?: unknown } }
    const status = upstream.response?.status ?? 502
    throw createError({
      statusCode: status,
      statusMessage: 'Authentication failed',
      data: safeUpstreamData(upstream.response?._data, status),
    })
  }
})
