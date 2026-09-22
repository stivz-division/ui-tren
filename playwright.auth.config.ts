import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/auth-browser',
  outputDir: './test-results/auth-browser',
  workers: 1,
  use: {
    channel: 'chrome',
    ignoreHTTPSErrors: true,
    viewport: { width: 390, height: 844 },
    launchOptions: { args: ['--test-third-party-cookie-phaseout'] },
    // All credentials in this isolated fixture are synthetic. Do not capture auth traces.
    trace: 'off',
  },
  webServer: [
    { command: 'node tests/fixtures/auth-server.mjs', url: 'http://127.0.0.1:4180/health' },
    {
      command: './node_modules/.bin/nuxt dev --host 127.0.0.1 --port 4174',
      url: 'http://127.0.0.1:4174',
      env: { NUXT_API_BASE: 'http://127.0.0.1:4180/api', APP_ENV: 'production', TELEGRAM_INIT_DATA: '', NUXT_TELEGRAM_INIT_DATA: '' },
    },
  ],
})
