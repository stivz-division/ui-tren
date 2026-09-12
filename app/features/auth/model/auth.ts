type RequestFunction = (path: string, options?: Record<string, unknown>) => Promise<unknown>

function getStatusCode(error: unknown): number {
  if (!error || typeof error !== 'object') return 0
  const value = error as { status?: number, statusCode?: number, response?: { status?: number } }
  return value.statusCode ?? value.status ?? value.response?.status ?? 0
}

export function createAuthCoordinator<T>(authenticateRequest: () => Promise<T>) {
  let inFlight: Promise<T> | null = null

  return {
    authenticate(): Promise<T> {
      if (!inFlight) {
        inFlight = authenticateRequest().finally(() => {
          inFlight = null
        })
      }
      return inFlight
    },
  }
}

export function createAuthorizedRequest(
  request: RequestFunction,
  reauthenticate: () => Promise<void>,
): RequestFunction {
  return async (path, options) => {
    try {
      return await request(path, options)
    }
    catch (error) {
      if (getStatusCode(error) !== 401) throw error
      await reauthenticate()
      return await request(path, options)
    }
  }
}
