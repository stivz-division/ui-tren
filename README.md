# UI Tren

Frontend для Telegram Mini App на Nuxt 4 и Nuxt UI. Laravel API работает как отдельный внешний сервис.

## Локальный запуск

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Приложение будет доступно на `http://localhost:3000`.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

Compose запускает только Nuxt UI. Адрес Laravel API задаётся переменной `NUXT_API_BASE`.
