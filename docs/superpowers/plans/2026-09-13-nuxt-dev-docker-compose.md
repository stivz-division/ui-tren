# Nuxt Dev Docker Compose Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить минимальное Docker Compose окружение для локальной разработки Nuxt UI с внешним Laravel API.

**Architecture:** Один контейнер `ui` запускает Nuxt dev server на Node.js 24.21.0 Alpine через pnpm. Исходники монтируются с хоста, контейнерные зависимости сохраняются в отдельном volume, а адрес Laravel передаётся через `NUXT_API_BASE`.

**Tech Stack:** Docker, Docker Compose, Node.js 24.21.0 Alpine, Corepack, pnpm, Nuxt 4.

**Spec:** `docs/superpowers/specs/2026-09-13-nuxt-dev-docker-compose-design.md`

## Global Constraints

- Compose содержит ровно один сервис `ui`.
- Laravel API является внешним сервисом и не контейнеризируется.
- Не добавлять production stages, reverse proxy, PostgreSQL, Redis, CI/CD или deploy-скрипты.
- Использовать `node:24.21.0-alpine`, pnpm и порт контейнера `3000`.
- Не помещать секреты и локальный `.env` в Git или Docker build context.
- Полная сборка ожидаемо невозможна до появления `package.json` и `pnpm-lock.yaml` в Nuxt scaffold.

---

## File Map

- Create: `Dockerfile` — development image и команда запуска Nuxt.
- Create: `compose.yml` — единственный сервис `ui`, port mapping, environment, mounts и host gateway.
- Create: `.dockerignore` — минимальный безопасный build context.
- Create: `.env.example` — публичные примеры настроек порта и внешнего API.
- Create: `.gitignore` — локальные переменные, зависимости, Nuxt output и IDE-файлы.
- Modify: `AGENTS.md` — добавить Docker-файлы и команды в карту проекта.

### Task 1: Dev-only Docker Compose

**Files:**
- Create: `Dockerfile`
- Create: `compose.yml`
- Create: `.dockerignore`
- Create: `.env.example`
- Create: `.gitignore`
- Modify: `AGENTS.md`
- Verify: `docs/superpowers/specs/2026-09-13-nuxt-dev-docker-compose-design.md`

**Interfaces:**
- Consumes: будущие `package.json` и `pnpm-lock.yaml`, переменные `APP_PORT` и `NUXT_API_BASE`.
- Produces: сервис Compose `ui`, HTTP endpoint `http://localhost:${APP_PORT:-3000}`, Docker volume `ui_node_modules`.

- [x] **Step 1: Зафиксировать ожидаемое отсутствие конфигурации**

Run:

```bash
test ! -e Dockerfile && test ! -e compose.yml && test ! -e .dockerignore && test ! -e .env.example && test ! -e .gitignore
```

Expected: PASS, подтверждающий, что новые артефакты ещё не существуют и будут добавлены этой задачей.

- [x] **Step 2: Создать development Dockerfile**

Create `Dockerfile`:

```dockerfile
FROM node:24.21.0-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["pnpm", "dev", "--host", "0.0.0.0"]
```

- [x] **Step 3: Создать Compose с одним UI-сервисом**

Create `compose.yml`:

```yaml
services:
  ui:
    build:
      context: .
    init: true
    command: pnpm dev --host 0.0.0.0
    environment:
      NUXT_API_BASE: ${NUXT_API_BASE:-http://host.docker.internal:8000/api}
    ports:
      - "${APP_PORT:-3000}:3000"
    volumes:
      - .:/app
      - ui_node_modules:/app/node_modules
    extra_hosts:
      - host.docker.internal:host-gateway

volumes:
  ui_node_modules:
```

- [x] **Step 4: Ограничить build context и локальные Git-файлы**

Create `.dockerignore`:

```gitignore
.git
.github
.idea
.agents
.codex
.ai-factory
docs
node_modules
.nuxt
.output
.data
.env
.env.*
!.env.example
npm-debug.log*
pnpm-debug.log*
```

Create `.gitignore`:

```gitignore
.env
.env.*
!.env.example
node_modules/
.nuxt/
.output/
.data/
.idea/
*.log
```

- [x] **Step 5: Документировать переменные окружения**

Create `.env.example`:

```dotenv
APP_PORT=3000
NUXT_API_BASE=http://host.docker.internal:8000/api
```

- [x] **Step 6: Обновить карту проекта**

В `AGENTS.md` добавить раздел локального запуска с командами:

```markdown
## Локальный запуск в Docker

- `cp .env.example .env`
- `docker compose build`
- `docker compose up`

Compose запускает только Nuxt UI. Laravel API должен быть доступен отдельно по адресу из `NUXT_API_BASE`.
```

- [x] **Step 7: Проверить Compose и границы конфигурации**

Run:

```bash
docker compose --env-file .env.example config
```

Expected: exit code `0`; единственный service — `ui`; опубликован порт `3000`; `NUXT_API_BASE` указывает на `host.docker.internal:8000/api`; volume — `ui_node_modules`.

Run:

```bash
test "$(docker compose --env-file .env.example config --services)" = "ui"
git check-ignore .env .idea/workspace.xml node_modules/example .nuxt/example .output/example
git diff --check
```

Expected: все команды завершаются с exit code `0`.

Не запускать `docker compose build`, пока отсутствуют `package.json` и `pnpm-lock.yaml`; это известная граница текущего пустого scaffold, а не ошибка Docker-конфигурации.

- [x] **Step 8: Закоммитить реализацию**

```bash
git add Dockerfile compose.yml .dockerignore .env.example .gitignore AGENTS.md docs/superpowers/plans/2026-09-13-nuxt-dev-docker-compose.md
git commit -m "chore: add Nuxt development Docker setup"
```
