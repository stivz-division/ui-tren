import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'happy-dom',
    include: ['app/**/*.test.ts', 'server/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
  },
})
