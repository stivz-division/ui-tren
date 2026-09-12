# UI Tren

Mobile-first frontend Telegram Mini App для недельного расписания тренировок. Приложение построено на Nuxt 4, Vue 3 и Nuxt UI; Laravel API работает как отдельный внешний сервис.

Реализованы главная с состояниями тренировки/отдыха, список программ, создание, просмотр, редактирование и удаление программы, а также запуск активной тренировочной сессии. Полный экран выполнения сессии остаётся отдельной задачей.

## Локальный запуск

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Приложение будет доступно на `http://localhost:3000`.

Для запуска вне Telegram можно задать в `.env` непустой `TELEGRAM_INIT_DATA`. Значение используется вместо `window.Telegram.WebApp.initData` только при `APP_ENV=local`. Обе переменные читаются сервером; `TELEGRAM_INIT_DATA` не попадает в client bundle, логи или persistent browser storage.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

Compose запускает только Nuxt UI. Адрес Laravel API задаётся переменной `NUXT_API_BASE`.

## Backend-зависимость

Конструктору и человекочитаемым карточкам нужен `GET /api/exercises` с полями `id` и `name`. Пока endpoint отсутствует, UI показывает безопасные подписи вида «Упражнение №10» для уже сохранённых программ и явно сообщает, что добавление упражнений недоступно. Production-каталог не захардкожен.

## Проверки

```bash
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:e2e
pnpm build
```

Playwright проверяет ширины 320, 375 и 430 px. Для локального E2E нужен установленный Google Chrome.
