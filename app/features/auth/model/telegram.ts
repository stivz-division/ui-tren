export interface TelegramBackButton {
  hide: () => void
  offClick: (handler: () => void) => void
  onClick: (handler: () => void) => void
  show: () => void
}

export interface TelegramWebApp {
  BackButton?: TelegramBackButton
  initData: string
  initDataUnsafe?: {
    user?: {
      first_name?: string
    }
  }
  ready: () => void
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp
    }
  }
}
