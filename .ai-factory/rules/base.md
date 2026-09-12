# Базовые правила проекта

> Проект пока не содержит application code. Ниже зафиксированы соглашения выбранного стека и интеграционного контракта; уточняйте их по мере появления устойчивых паттернов в codebase.

## Соглашения об именовании

- Файлы Vue-компонентов: `PascalCase.vue`.
- Страницы, маршруты и feature-каталоги: `kebab-case` с учётом file-based routing Nuxt.
- Переменные и функции: `camelCase`.
- Composables: `useXxx` и файл `useXxx.ts`.
- TypeScript types, interfaces и enum-like unions: `PascalCase`.
- Константы уровня модуля: `UPPER_SNAKE_CASE`, если значение действительно неизменно.

## Структура модулей

- Соблюдать Nuxt 4 layout: Vue application code в `app/`, shared types в `shared/`, server-only adapters в `server/`, статические файлы в `public/`.
- Группировать предметный код по features: `auth`, `training-programs`, `workout-sessions`, `workout-history`.
- Общие UI primitives не должны импортировать feature-модули.
- Telegram и HTTP API скрывать за узкими adapters/composables; компоненты не должны собирать URL или Authorization header вручную.

## Обработка ошибок

- Нормализовать transport, Laravel validation и domain errors в единую типизированную модель.
- Явно обрабатывать `401`, `404`, `409`, `422`, `429`; не превращать все ошибки в одно общее уведомление.
- Не выполнять автоматический retry для небезопасных mutations и `409 Conflict` без подтверждённой idempotency.
- Не логировать Telegram `initData`, Bearer token и персональные данные.

## Управление потоком

- Предпочитать плоский и читаемый control flow глубоко вложенным условиям. Использовать guard clauses, ранний `return`, небольшие именованные helpers и явную классификацию состояний, когда это делает основной путь заметнее.
- Обрабатывать недоступное Telegram-окружение, отсутствие active session и terminal statuses до основного happy path.

## Логирование

- Использовать централизованный logger; `console.log` допустим только для локальной диагностики и не должен попадать в production flow.
- Сообщения должны содержать безопасный контекст операции, но не request body аутентификации и не Authorization header.

## Тестирование

- Unit/component tests: Vitest и `@nuxt/test-utils`.
- End-to-end tests: Playwright с мобильным viewport и заглушкой Telegram bridge.
- Для API adapters проверять response envelopes, `data: null`, cursor pagination и все поддерживаемые классы ошибок.

## References

- Для Telegram auth, REST payloads, response envelopes, domain errors и известных пробелов backend использовать `.ai-factory/references/api-tren-contract.md`.
