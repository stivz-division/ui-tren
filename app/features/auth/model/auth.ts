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
  onFailure: (error: unknown) => void = () => {},
) {
  interface RecoveryState { recovery: Promise<void> | null, failure: unknown }
  let state: RecoveryState = { recovery: null, failure: null }

  function fail(current: RecoveryState, error: unknown): never {
    if (!current.failure) {
      current.failure = error
      if (current === state) onFailure(error)
    }
    throw current.failure
  }

  const authorized: RequestFunction = async (path, options) => {
    const current = state
    if (current.failure) throw current.failure
    // Requests started during recovery wait for the new cookie.
    const startedAfterRecovery = Boolean(current.recovery)
    if (current.recovery) await current.recovery
    try {
      return await request(path, options)
    }
    catch (error) {
      if (getStatusCode(error) !== 401) throw error
      if (current.failure) throw current.failure
      if (startedAfterRecovery) fail(current, error)
      // Keep the settled promise: late 401s from the old session share this attempt.
      current.recovery ??= Promise.resolve().then(reauthenticate).catch(error => fail(current, error))
      await current.recovery
      if (current.failure) throw current.failure
      if (options?.method && options.method !== 'GET') throw error
      try {
        return await request(path, options)
      }
      catch (retryError) {
        if (getStatusCode(retryError) === 401) fail(current, retryError)
        throw retryError
      }
    }
  }

  return Object.assign(authorized, {
    // Only an explicit login begins a new automatic recovery budget.
    reset() { state = { recovery: null, failure: null } },
  })
}
