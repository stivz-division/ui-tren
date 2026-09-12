import type { TelegramWebApp } from '../model/telegram'

export function useTelegram() {
  function getWebApp(): TelegramWebApp | null {
    if (!import.meta.client) return null
    return window.Telegram?.WebApp ?? null
  }

  return { getWebApp }
}
