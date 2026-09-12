export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxt/eslint'],

  css: ['~/assets/css/main.css'],

  devtools: {
    enabled: false,
  },

  runtimeConfig: {
    apiBase: 'http://localhost:8000/api',
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
