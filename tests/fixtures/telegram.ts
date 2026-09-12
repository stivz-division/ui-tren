import { vi } from 'vitest'

export interface TelegramBackButtonStub {
  hide: ReturnType<typeof vi.fn>
  offClick: ReturnType<typeof vi.fn>
  onClick: ReturnType<typeof vi.fn>
  show: ReturnType<typeof vi.fn>
}

export function createTelegramWebAppStub() {
  const BackButton: TelegramBackButtonStub = {
    hide: vi.fn(),
    offClick: vi.fn(),
    onClick: vi.fn(),
    show: vi.fn(),
  }

  return {
    BackButton,
    initData: 'query_id=test-query&auth_date=1789257600&hash=test-hash',
    initDataUnsafe: {
      user: {
        first_name: 'Алексей',
        id: 42,
      },
    },
    ready: vi.fn(),
  }
}
