# Проектирование dev-only Docker Compose для Nuxt UI

Дата: 2026-09-13  
Статус: согласовано пользователем

## Цель

Добавить минимальное локальное Docker-окружение только для Nuxt UI. Laravel API остаётся отдельным внешним сервисом и не входит в Compose.

## Границы решения

В Compose будет ровно один сервис `ui`. Решение не включает production-образ, reverse proxy, Laravel, PostgreSQL, Redis, CI/CD и deploy-скрипты.

## Файлы

- `Dockerfile` — один development-образ на `node:24.21.0-alpine` с Corepack и pnpm.
- `compose.yml` — запуск Nuxt dev server, публикация порта и монтирование исходников.
- `.dockerignore` — исключение локальных зависимостей, артефактов сборки, Git-метаданных, IDE-файлов и секретов.
- `.env.example` — документированные значения `APP_PORT` и `NUXT_API_BASE`.
- `.gitignore` — исключение `.env`, Nuxt-артефактов и зависимостей.

## Поведение контейнера

Рабочая директория — `/app`. Dockerfile сначала копирует `package.json`, `pnpm-lock.yaml` и `pnpm-workspace.yaml`, устанавливает зависимости через `pnpm install --frozen-lockfile`, затем копирует проект. Команда запуска — `pnpm dev --host 0.0.0.0`, внутренний порт — `3000`.

Compose монтирует рабочую копию в `/app`, а `/app/node_modules` хранит в именованном volume, чтобы зависимости контейнера не смешивались с зависимостями хоста. Порт хоста задаётся через `${APP_PORT:-3000}`.

Для обращения из контейнера к Laravel API, запущенному на хосте, используется `host.docker.internal`. На Linux Compose добавляет `host-gateway`. Значение по умолчанию в примере окружения: `NUXT_API_BASE=http://host.docker.internal:8000/api`.

## Конфигурация и секреты

`.env` не коммитится. В репозитории хранится только `.env.example` без секретов. Telegram init data, API-токены и другие учётные данные не встраиваются в Docker image и не задаются в Compose.

## Проверка

После появления Docker-файлов выполняются:

1. `docker compose config` — проверка структуры и подстановки переменных.
2. `docker compose build` — проверка установки зафиксированных pnpm-зависимостей в Node.js 24.21.0 Alpine.
3. `docker compose up` и проверка `http://localhost:${APP_PORT:-3000}` — проверка Nuxt dev server.

Репозиторий содержит минимальный Nuxt scaffold и lockfile, поэтому Docker-конфигурация проверяется полной сборкой и запуском контейнера.

## Критерии готовности

- Compose описывает только сервис Nuxt UI.
- Изменения исходников на хосте подхватываются dev server без пересборки образа.
- Laravel API на хосте доступен через настраиваемый `NUXT_API_BASE`.
- Локальный `.env` и зависимости не попадают в Git или build context.
- В конфигурации отсутствуют production-инфраструктура и лишние сервисы.
