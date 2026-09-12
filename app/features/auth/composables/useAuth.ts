import { createAuthCoordinator } from '../model/auth'
import { normalizeApiError } from '~/features/training-programs/model/errors'
import { logger } from '~/utils/logger'
import { useTelegram } from './useTelegram'

export type AuthStatus = 'idle' | 'pending' | 'authenticated' | 'error'

let activeAuthentication: ReturnType<typeof createAuthCoordinator<void>> | null = null

export function useAuth() {
  const status = useState<AuthStatus>('auth-status', () => 'idle')
  const firstName = useState<string | null>('telegram-first-name', () => null)
  const errorMessage = useState<string | null>('auth-error', () => null)
  const { getWebApp } = useTelegram()

  async function authenticateRequest(): Promise<void> {
    const webApp = getWebApp()
    status.value = 'pending'
    errorMessage.value = null
    firstName.value = webApp?.initDataUnsafe?.user?.first_name?.trim() || null
    logger.debug('auth.bootstrap.started', { hasTelegramWebApp: Boolean(webApp) })

    try {
      await $fetch('/api/auth', {
        method: 'POST',
        body: { init_data: webApp?.initData ?? '' },
      })
      webApp?.ready()
      status.value = 'authenticated'
      logger.info('auth.bootstrap.completed')
    }
    catch (error) {
      status.value = 'error'
      errorMessage.value = 'Не удалось войти через Telegram. Повторите попытку.'
      logger.warn('auth.bootstrap.failed', { status: normalizeApiError(error).status })
      throw error
    }
  }

  function coordinator() {
    activeAuthentication ??= createAuthCoordinator(authenticateRequest)
    return activeAuthentication
  }

  async function bootstrap(): Promise<void> {
    if (status.value === 'authenticated') return
    await coordinator().authenticate()
  }

  async function reauthenticate(): Promise<void> {
    status.value = 'idle'
    await coordinator().authenticate()
  }

  return { status: readonly(status), firstName: readonly(firstName), errorMessage: readonly(errorMessage), bootstrap, reauthenticate }
}
