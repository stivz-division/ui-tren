# AGENTS.md

> Поддерживайте этот файл как краткую фактическую карту проекта. При существенном изменении структуры, стека или entry points обновляйте соответствующие разделы.

## Обзор проекта

UI Tren — mobile-first frontend на Nuxt 4 для Telegram Mini App и Laravel API `stivz-division/api-tren`. Создан минимальный Nuxt scaffold с Nuxt UI; продуктовые features ещё не реализованы.

## Технологический стек

- **Язык:** TypeScript
- **Framework:** Nuxt 4, Vue 3, Composition API
- **UI:** Nuxt UI 4, Tailwind CSS
- **Backend:** внешний Laravel 13 REST API
- **База данных:** отсутствует в UI; PostgreSQL принадлежит backend
- **ORM:** не используется
- **Тестирование:** планируются Vitest, `@nuxt/test-utils`, Playwright

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
│   ├── app.vue                       # Корневой UApp wrapper
│   ├── assets/css/main.css           # Tailwind CSS и Nuxt UI styles
│   └── pages/index.vue               # Стартовая страница
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

Целевую структуру product features смотреть в `.ai-factory/ARCHITECTURE.md`; не создавайте пустые каталоги заранее.

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
| `app/pages/index.vue` | Стартовый route `/` |
| `compose.yml` | Dev-only Docker Compose для Nuxt UI |
| `README.md` | Краткая текущая landing page репозитория |

## Локальный запуск в Docker

- `cp .env.example .env`
- `docker compose build`
- `docker compose up`

Compose запускает только Nuxt UI. Laravel API должен быть доступен отдельно по адресу из `NUXT_API_BASE`.

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
- Не считать отсутствующие backend возможности реализованными. Каталог упражнений сейчас не имеет API endpoint.
- Не логировать и не сохранять в persistent client storage Telegram `initData`, Sanctum token или bot token.
- Backend response после mutation является authoritative state.
- Разделять shell-команды, изменяющие Git state:
  - Неверно: `git checkout master && git pull`.
  - Верно: сначала `git checkout master`, затем `git pull origin master`.
- Не перезаписывать несвязанные user changes и не создавать application code во время context-only `$aif` setup.
