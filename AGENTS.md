# AGENTS.md

> Поддерживайте этот файл как краткую фактическую карту проекта. При существенном изменении структуры, стека или entry points обновляйте соответствующие разделы.

## Обзор проекта

UI Tren — mobile-first frontend на Nuxt 4 для Telegram Mini App и Laravel API `stivz-division/api-tren`. Реализованы недельное расписание, CRUD тренировочных программ, Telegram auth через same-origin BFF и запуск активной тренировки; полный workflow выполнения сессии остаётся отдельной задачей.

## Технологический стек

- **Язык:** TypeScript
- **Framework:** Nuxt 4, Vue 3, Composition API
- **UI:** Nuxt UI 4, Tailwind CSS
- **Backend:** внешний Laravel 13 REST API
- **База данных:** отсутствует в UI; PostgreSQL принадлежит backend
- **ORM:** не используется
- **Тестирование:** Vitest, `@nuxt/test-utils`, Playwright

## Структура проекта

```text
.
├── README.md                         # Текущая краткая landing page репозитория
├── AGENTS.md                         # Эта карта для AI agents
├── package.json                      # Dependencies и pnpm scripts
├── pnpm-lock.yaml                    # Зафиксированное дерево зависимостей
├── pnpm-workspace.yaml               # pnpm build-script allowlist
├── .nvmrc                            # Node.js 24.21.0 для локальной разработки
├── nuxt.config.ts                    # Nuxt UI, CSS и runtime config
├── tsconfig.json                     # TypeScript config от Nuxt
├── app/
│   ├── app.vue                       # UApp и auth gate
│   ├── assets/css/main.css           # Tailwind CSS и Nuxt UI styles
│   ├── components/ui/                # Shell, header, back и bottom navigation
│   ├── composables/useLocalClock.ts   # Клиентское время и timezone устройства с обновлением при resume
│   ├── features/auth/                # Telegram bootstrap и in-memory auth state
│   ├── features/training-programs/   # Schedule API, state, forms и screens
│   ├── features/workout-sessions/    # Start active session и handoff screen
│   ├── layouts/default.vue           # Общий AppShell
│   └── pages/                        # Тонкие routes /, /programs*, /workout-session
├── server/
│   ├── api/auth.post.ts              # Telegram initData -> HttpOnly session cookie
│   ├── api/api-tren/[...path].ts     # Allowlisted authenticated Laravel proxy
│   └── utils/api-tren/               # Proxy paths, cookie и safe error helpers
├── shared/types/api-tren.ts          # Wire DTO Laravel API
├── tests/e2e/                        # Playwright Telegram/mobile scenarios
├── Dockerfile                        # Development image для Nuxt UI
├── compose.yml                       # Локальный запуск единственного UI-сервиса
├── .env.example                      # Публичные настройки порта и внешнего API
├── skills-lock.json                  # Зафиксированные внешние Agent Skills
├── .agents/skills/                   # Nuxt, Nuxt UI и Vue best-practice skills
├── .ai-factory.json                  # Manifest установленного AI Factory
├── .ai-factory/
│   ├── config.yaml                   # Язык, пути и Git workflow AI Factory
│   ├── DESCRIPTION.md                # Продуктовый и технический контекст
│   ├── ARCHITECTURE.md               # Vertical-slice architecture guidelines
│   ├── references/
│   │   ├── INDEX.md                  # Индекс knowledge references
│   │   └── api-tren-contract.md      # Telegram auth и Laravel API contract
│   └── rules/base.md                 # Базовые соглашения Nuxt/TypeScript
└── .codex/
    ├── config.toml                   # Codex agents и MCP servers
    ├── agents/                       # Конфигурации специализированных agents
    └── skills/                       # AI Factory skills
```

Модульные границы и дальнейшую целевую структуру смотреть в `.ai-factory/ARCHITECTURE.md`; не создавайте пустые каталоги заранее.

## Ключевые entry points

| Файл | Назначение |
|---|---|
| `.ai-factory/DESCRIPTION.md` | Scope, стек, интеграции и нефункциональные требования |
| `.ai-factory/ARCHITECTURE.md` | Модульные границы, зависимости и BFF auth flow |
| `.ai-factory/references/api-tren-contract.md` | Проверенный API contract и известные backend gaps |
| `.ai-factory/rules/base.md` | Обязательные conventions для будущего application code |
| `.ai-factory/config.yaml` | Настройки AI Factory; base branch — `master` |
| `.codex/config.toml` | GitHub и Playwright MCP configuration |
| `nuxt.config.ts` | Modules, global CSS и server-only `apiBase` |
| `app/app.vue` | Корневой Nuxt UI provider |
| `app/pages/index.vue` | Главная с тренировкой сегодня или rest day |
| `app/pages/programs/` | Список, создание, просмотр и редактирование программ |
| `server/api/auth.post.ts` | BFF auth и server-only local-подмена `TELEGRAM_INIT_DATA` |
| `server/api/api-tren/[...path].ts` | Узкий allowlisted proxy к Laravel API |
| `compose.yml` | Dev-only Docker Compose для Nuxt UI |
| `README.md` | Краткая текущая landing page репозитория |

## Локальный запуск в Docker

- `cp .env.example .env`
- `docker compose build`
- `docker compose up`

Compose запускает только Nuxt UI. Laravel API должен быть доступен отдельно по адресу из `NUXT_API_BASE`; для backend на хосте используется `http://host.docker.internal:8000/api`. При `APP_ENV=local` непустой server-only `TELEGRAM_INIT_DATA` заменяет browser `initData` только в BFF-запросе к Laravel.

## Документация

| Документ | Путь | Описание |
|---|---|---|
| README | `README.md` | Минимальная landing page; подробная документация ещё не создана |
| Описание проекта | `.ai-factory/DESCRIPTION.md` | Цели, возможности и tech stack |
| Архитектура | `.ai-factory/ARCHITECTURE.md` | Правила организации будущего Nuxt codebase |
| API contract | `.ai-factory/references/api-tren-contract.md` | Telegram auth, endpoints, payloads, errors и gaps |

## AI context files

| Файл | Назначение |
|---|---|
| `AGENTS.md` | Быстрая карта репозитория и рабочие правила |
| `.ai-factory/DESCRIPTION.md` | Источник продуктового и технического scope |
| `.ai-factory/ARCHITECTURE.md` | Источник архитектурных решений |
| `.ai-factory/rules/base.md` | Базовые project conventions |
| `.ai-factory/references/INDEX.md` | Каталог versioned references |

## Установленные внешние skills

- `nuxt` — Nuxt 4 directory structure, rendering, data fetching и deployment.
- `nuxt-ui` — Nuxt UI 4 components, accessibility и design system.
- `vue-best-practices` — Vue 3 Composition API, SFC и component boundaries.

Перед обновлением внешнего skill повторно выполните automated и semantic security scan по правилам `$aif`.

## Правила для agents

- Перед планированием или реализацией читать `.ai-factory/DESCRIPTION.md`, `.ai-factory/ARCHITECTURE.md`, `.ai-factory/rules/base.md` и релевантные references.
- Каталог упражнений загружать только через backend `GET /api/exercises`; не добавлять production mock-данные.
- Не логировать и не сохранять в persistent client storage Telegram `initData`, Sanctum token или bot token.
- Backend response после mutation является authoritative state.
- Разделять shell-команды, изменяющие Git state:
  - Неверно: `git checkout master && git pull`.
  - Верно: сначала `git checkout master`, затем `git pull origin master`.
- Не перезаписывать несвязанные user changes и не создавать application code во время context-only `$aif` setup.
