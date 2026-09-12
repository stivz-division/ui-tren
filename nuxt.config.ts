export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxt/eslint'],

  css: ['~/assets/css/main.css'],

  components: [
    { path: '~/components', pathPrefix: false },
    { path: '~/features', pattern: '**/components/**/*.vue', pathPrefix: false },
  ],

  devtools: {
    enabled: false,
  },

  runtimeConfig: {
    apiBase: 'http://localhost:8000/api',
    appEnv: process.env.APP_ENV ?? 'production',
    telegramInitData: process.env.TELEGRAM_INIT_DATA ?? '',
    logLevel: process.env.LOG_LEVEL ?? 'warn',
  },

  app: {
    head: {
      htmlAttrs: {
        lang: 'ru',
      },
      title: 'UI Tren',
      meta: [
        {
          name: 'description',
          content: 'Telegram Mini App для планирования и прохождения тренировок',
        },
      ],
    },
  },
})
