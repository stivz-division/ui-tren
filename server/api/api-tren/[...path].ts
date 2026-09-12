import { clearApiTrenToken, getApiTrenToken, safeUpstreamData } from '../../utils/api-tren/request'
import { isAllowedApiRequest } from '../../utils/api-tren/paths'

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path') ?? ''
  const method = event.method.toUpperCase()

  if (!isAllowedApiRequest(method, path)) {
    throw createError({ statusCode: 404, statusMessage: 'Route not found' })
  }

  const token = getApiTrenToken(event)
  const config = useRuntimeConfig(event)

  try {
    const response = await $fetch.raw(`/${path}`, {
      baseURL: config.apiBase,
      method: method as 'GET' | 'POST' | 'PUT' | 'DELETE',
      query: getQuery(event),
      body: ['POST', 'PUT'].includes(method) ? await readBody(event) : undefined,
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${token}`,
      },
    })

    setResponseStatus(event, response.status)
    return response.status === 204 ? null : response._data
  }
  catch (error) {
    const upstream = error as { response?: { status?: number, _data?: unknown } }
    const status = upstream.response?.status ?? 502
    if (status === 401) clearApiTrenToken(event)
    throw createError({
      statusCode: status,
      statusMessage: 'API request failed',
      data: safeUpstreamData(upstream.response?._data, status),
    })
  }
})
