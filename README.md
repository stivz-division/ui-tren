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

Для запуска вне Telegram можно задать в `.env` непустой `TELEGRAM_INIT_DATA`. При `APP_ENV=local` Nuxt BFF использует это значение вместо browser `initData` только в серверном запросе к Laravel. Fixture не попадает в client bundle, логи или persistent browser storage.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

Compose запускает только Nuxt UI. Адрес Laravel API задаётся переменной `NUXT_API_BASE`; для Laravel на хост-машине используйте `http://host.docker.internal:8000/api`.

## Каталог упражнений

Конструктор и карточки загружают production-каталог через `GET /api/exercises` с полями `id` и `name`. При временной ошибке UI предлагает повторить запрос; для ранее сохранённого неизвестного `exercise_id` используется безопасная подпись вида «Упражнение №10». Каталог в frontend не захардкожен.

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
