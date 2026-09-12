import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel: 'chrome',
    colorScheme: 'light',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile-320',
      use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 720 } },
    },
    {
      name: 'mobile-375',
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 } },
    },
    {
      name: 'mobile-430',
      use: { ...devices['Desktop Chrome'], viewport: { width: 430, height: 932 } },
    },
  ],
  webServer: {
    command: `./node_modules/.bin/nuxt dev --host 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: true,
    env: {
      APP_ENV: 'local',
      TELEGRAM_INIT_DATA: 'e2e-server-init-data',
    },
  },
})
