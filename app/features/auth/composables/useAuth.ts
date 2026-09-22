import { createAuthCoordinator, createAuthorizedRequest } from '../model/auth'
import { normalizeApiError } from '~/utils/api-error'
import { logger } from '~/utils/logger'
import { useTelegram } from './useTelegram'

export type AuthStatus = 'idle' | 'pending' | 'authenticated' | 'error'

interface AuthRuntime {
  authentication: ReturnType<typeof createAuthCoordinator<void>>
  request: ReturnType<typeof createAuthorizedRequest>
}

const runtimes = new WeakMap<ReturnType<typeof useNuxtApp>, AuthRuntime>()

export function useAuth() {
  const app = useNuxtApp()
  const status = useState<AuthStatus>('auth-status', () => 'idle')
  const firstName = useState<string | null>('telegram-first-name', () => null)
  const errorMessage = useState<string | null>('auth-error', () => null)
  const { getWebApp } = useTelegram()

  async function authenticateRequest(): Promise<void> {
    const webApp = getWebApp()
    // Recovery must not retrigger every authenticated-status watcher.
    if (status.value !== 'authenticated') status.value = 'pending'
    errorMessage.value = null
    firstName.value = webApp?.initDataUnsafe?.user?.first_name?.trim() || null
    logger.debug('auth.bootstrap.started', { hasTelegramWebApp: Boolean(webApp) })

    try {
      await $fetch('/api/auth', {
        method: 'POST',
        headers: { 'x-ui-tren-request': '1' },
        retry: 0,
        body: { init_data: webApp?.initData ?? '' },
      })
      webApp?.ready()
      status.value = 'authenticated'
      logger.info('auth.bootstrap.completed')
    }
    catch (error) {
      status.value = 'error'
      errorMessage.value = normalizeApiError(error).status === 429
        ? 'Слишком много попыток входа. Подождите минуту и повторите.'
        : 'Не удалось войти через Telegram. Повторите попытку.'
      logger.warn('auth.bootstrap.failed', { status: normalizeApiError(error).status })
      throw error
    }
  }

  function runtime(): AuthRuntime {
    let value = runtimes.get(app)
    if (!value) {
      const authentication = createAuthCoordinator(authenticateRequest)
      const request = createAuthorizedRequest(
        (path, options) => $fetch(path, {
          ...options,
          headers: { 'x-ui-tren-request': '1' },
          retry: !options?.method || options.method === 'GET' ? 1 : 0,
          retryStatusCodes: [408, 500, 502, 503, 504],
        }),
        () => authentication.authenticate(),
        (error) => {
          status.value = 'error'
          errorMessage.value = normalizeApiError(error).status === 401
            ? 'Не удалось сохранить сессию. Разрешите cookies для Mini App или откройте приложение в Telegram на телефоне, затем повторите вход.'
            : errorMessage.value ?? 'Не удалось восстановить вход. Повторите попытку.'
        },
      )
      value = { authentication, request }
      runtimes.set(app, value)
    }
    return value
  }

  async function bootstrap(): Promise<void> {
    if (status.value === 'authenticated') return
    const current = runtime()
    current.request.reset()
    await current.authentication.authenticate()
  }

  return { status: readonly(status), firstName: readonly(firstName), errorMessage: readonly(errorMessage), bootstrap, authorizedRequest: runtime().request }
}
