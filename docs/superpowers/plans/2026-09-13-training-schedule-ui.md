# Training Schedule UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать проверяемый mobile-first интерфейс недельного расписания и запуска тренировки в существующем Nuxt 4 Telegram Mini App.

**Architecture:** Тонкие Nuxt routes компонуют vertical slices `auth`, `training-programs` и минимальный `workout-sessions`. Browser работает только с узким same-origin BFF; Bearer token хранится в `HttpOnly` cookie, а wire DTO, editable draft и presentation helpers разделены.

**Tech Stack:** TypeScript 6, Nuxt 4.5, Vue 3.5 Composition API, Nuxt UI 4, Tailwind CSS 4, Vitest, Vue Test Utils, Nuxt Test Utils, Playwright, ESLint.

**Spec:** `docs/superpowers/specs/2026-09-13-training-schedule-ui-design.md`

## Global Constraints

- Backend Laravel API и его payloads не изменяются.
- Production-код не содержит статического каталога упражнений и загружает его через `GET /api/exercises`.
- Telegram `initData`, Bearer token и bot token не логируются и не сохраняются в browser persistence.
- Все даты расписания вычисляются в `Europe/Moscow` через одну config constant.
- Компоненты используют Vue 3 Composition API и `<script setup lang="ts">`.
- UI имеет две нижние вкладки, touch targets минимум 44×44 px, ширину контента максимум 480 px и safe-area/dvh support.
- Никаких gradients, emoji-иконок, длительности «~45 минут», калорий, streaks или аналитики.
- Каждый production behavior реализуется только после наблюдаемого RED test согласно TDD.
- `Docs: yes` — после реализации обновить фактическую карту `AGENTS.md`, README и архитектурную структуру без перезаписи пользовательских документов.

## Tasks

- [x] Task 1: Настроить quality toolchain и test harness
- [x] Task 2: Реализовать wire types и чистую доменную модель расписания
- [x] Task 3: Реализовать безопасный BFF, Telegram bootstrap и нормализацию ошибок
- [x] Task 4: Реализовать query/mutation state и общий application shell
- [x] Task 5: Реализовать главную и список программ
- [x] Task 6: Реализовать общую create/edit форму программы
- [x] Task 7: Реализовать просмотр, удаление и запуск active session
- [x] Task 8: Завершить responsive/E2E проверку и документацию

---

### Task 1: Настроить quality toolchain и test harness

**Files:**
- Modify: `package.json`
- Modify: `nuxt.config.ts`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `tests/setup.ts`
- Create: `tests/fixtures/telegram.ts`
- Create: `tests/fixtures/programs.ts`

**Interfaces:**
- Produces: scripts `format:check`, `lint`, `test`, `test:unit`, `test:e2e`; shared Telegram/API fixtures for later tasks.

- [ ] **Step 1: Add exact development dependencies and scripts**

  Add `@nuxt/eslint`, `@nuxt/test-utils`, `@playwright/test`, `@vue/test-utils`, `eslint`, `happy-dom`, `vitest`, and `@iconify-json/lucide`. Define scripts:

  ```json
  {
    "format:check": "eslint .",
    "lint": "eslint .",
    "test": "vitest run",
    "test:unit": "vitest run",
    "test:e2e": "playwright test"
  }
  ```

- [ ] **Step 2: Configure Nuxt ESLint, Vitest, and Playwright**

  Enable `@nuxt/eslint` in Nuxt, use `defineVitestConfig` with `environment: 'happy-dom'` and `tests/setup.ts`, and configure Playwright projects for 320×720, 375×812, and 430×932 against `pnpm dev`.

- [ ] **Step 3: Add deterministic fixtures**

  Export a Telegram WebApp stub with `initData`, display-only `initDataUnsafe.user.first_name`, `ready`, and `BackButton`; export three ordered/unordered program fixtures and an exercise catalog fixture only under `tests/`.

- [ ] **Step 4: Verify toolchain**

  Run `pnpm install`, `pnpm lint`, `pnpm typecheck`, and `pnpm test:unit --passWithNoTests`. Expected: all commands exit 0.

### Task 2: Реализовать wire types и чистую доменную модель расписания

**Files:**
- Create: `shared/types/api-tren.ts`
- Create: `app/features/training-programs/model/program.ts`
- Create: `app/features/training-programs/model/program.test.ts`
- Create: `app/features/training-programs/model/form.ts`
- Create: `app/features/training-programs/model/form.test.ts`
- Create: `app/features/training-programs/model/errors.ts`
- Create: `app/features/training-programs/model/errors.test.ts`
- Create: `app/utils/date.ts`
- Create: `app/utils/date.test.ts`

**Interfaces:**
- Produces: `Weekday`, `TrainingProgram`, `Exercise`, `WorkoutSession`, `ProgramDraft`, `createProgramDraft`, `toCreateProgramInput`, `toUpdateProgramInput`, `addSet`, `removeSet`, `moveExercise`, `groupAdjacentSets`, `findNextProgram`, `normalizeApiError`.

- [ ] **Step 1: RED — specify grouping, sorting, rollover, weight formatting, and forbidden duration**

  Write tests asserting:

  ```ts
  expect(groupAdjacentSets([{ repetitions: 6, working_weight_kg: 100 }, { repetitions: 6, working_weight_kg: 100 }, { repetitions: 3, working_weight_kg: 140 }])).toBe('2×6 100 кг, 1×3 140 кг')
  expect(groupAdjacentSets([{ repetitions: 6, working_weight_kg: 100 }, { repetitions: 3, working_weight_kg: 140 }, { repetitions: 6, working_weight_kg: 100 }])).toBe('1×6 100 кг, 1×3 140 кг, 1×6 100 кг')
  expect(findNextProgram(7, [{ weekday: 1 }])).toMatchObject({ weekday: 1, daysUntil: 1 })
  ```

  Run the focused tests and confirm they fail because exports do not exist.

- [ ] **Step 2: GREEN — implement immutable presentation helpers**

  Add `APP_TIME_ZONE`, Russian weekday labels, stable weekday sorting, cyclical distance, adjacent run grouping, and `Intl.NumberFormat` with maximum two fractional digits. Re-run focused tests.

- [ ] **Step 3: RED — specify editable draft operations and payloads**

  Test comma/point decimal parsing, cloning the previous set, refusing deletion of the last set, 100-set cap, duplicate exercise validation, ordered create payload without `position`, and edit payload without `weekday`.

- [ ] **Step 4: GREEN — implement draft model and mapping**

  Keep input values as strings, generate stable client keys, return a typed validation result instead of throwing, and never mutate API DTOs. Re-run focused tests.

- [ ] **Step 5: RED/GREEN — normalize 401/404/409/422/429/network errors**

  Test Laravel validation paths such as `exercises.0.sets.1.repetitions`, domain codes, and safe fallback messages. Implement a discriminated `ApiError` union and re-run all Task 2 tests.

### Task 3: Реализовать безопасный BFF, Telegram bootstrap и нормализацию ошибок

**Files:**
- Modify: `nuxt.config.ts`
- Create: `server/utils/api-tren/request.ts`
- Create: `server/utils/api-tren/paths.ts`
- Create: `server/api/auth.post.ts`
- Create: `server/api/api-tren/[...path].ts`
- Create: `server/utils/api-tren/request.test.ts`
- Create: `app/features/auth/model/telegram.ts`
- Create: `app/features/auth/composables/useTelegram.ts`
- Create: `app/features/auth/composables/useAuth.ts`
- Create: `app/features/auth/components/AuthGate.vue`
- Create: `app/features/auth/composables/useAuth.test.ts`
- Create: `app/utils/api-client.ts`
- Create: `app/utils/logger.ts`

**Interfaces:**
- Consumes: `ApiError` from Task 2.
- Produces: `useAuth(): { status, firstName, bootstrap, reauthenticate }`, `apiRequest<T>()`, allowlisted BFF proxy, `AuthGate`.

- [ ] **Step 1: RED — test BFF path allowlist and secret handling**

  Verify only `training-programs`, `training-programs/{id}`, `training-programs/weekdays/{weekday}`, `exercises`, and `workout-sessions/active` with permitted methods pass; arbitrary hosts and traversal fail. Verify auth response sets cookie but never returns token.

- [ ] **Step 2: GREEN — implement server-only request and BFF routes**

  Use private `runtimeConfig.apiBase`, attach `Authorization` server-side, forward status/code/errors safely, clear cookie on 401, and emit structured logs containing operation/status only.

- [ ] **Step 3: RED — test deduplicated auth and one-time 401 recovery**

  Simulate concurrent bootstrap calls, a first protected 401 followed by success, and two consecutive 401 responses. Assert one shared login request and no infinite retry.

- [ ] **Step 4: GREEN — implement Telegram/auth/client adapters**

  Access Telegram only under `import.meta.client`, call `ready()`, use `initDataUnsafe` only for display name, keep auth state in Nuxt memory, and let `apiRequest` retry exactly once after coordinated re-authentication.

- [ ] **Step 5: Add calm full-screen auth states**

  `AuthGate` reserves the full viewport for pending state, exposes a safe retry for missing Telegram/auth failure, and never renders protected slot before success.

### Task 4: Реализовать query/mutation state и общий application shell

**Files:**
- Modify: `app/app.vue`
- Modify: `app/assets/css/main.css`
- Create: `app/app.config.ts`
- Create: `app/layouts/default.vue`
- Create: `app/components/ui/AppShell.vue`
- Create: `app/components/ui/BottomNavigation.vue`
- Create: `app/components/ui/ScreenHeader.vue`
- Create: `app/components/ui/BackButton.vue`
- Create: `app/features/training-programs/api/programs.ts`
- Create: `app/features/training-programs/api/exercises.ts`
- Create: `app/features/training-programs/composables/useTrainingPrograms.ts`
- Create: `app/features/training-programs/composables/useExerciseCatalog.ts`
- Create: `app/features/training-programs/composables/useProgramDraft.ts`
- Create: `app/features/training-programs/composables/useTrainingPrograms.test.ts`

**Interfaces:**
- Consumes: `apiRequest`, wire/domain models.
- Produces: `useTrainingPrograms`, `useExerciseCatalog`, `useProgramDraft`, shell/header/navigation components.

- [ ] **Step 1: RED — specify cache sorting and authoritative mutation replacement**

  Test initial sorting, create insertion, update replacement, delete removal, retryable loading/error state, and catalog 404 becoming `unavailable` rather than mock data.

- [ ] **Step 2: GREEN — implement typed feature API and keyed composables**

  Centralize envelopes in feature API, serialize mutations, refresh on conflicts, and store only the shared program cache—not duplicate copies in pages.

- [ ] **Step 3: RED/GREEN — specify draft dirty-state and restoration**

  Test keyed create/edit drafts, reset after success, retained values after 422/409, and `beforeRouteLeave` confirmation behavior.

- [ ] **Step 4: Build accessible shell and navigation**

  Apply semantic Nuxt UI colors, global 44 px controls, safe-area padding, `100dvh`, max-width 480 px, visible focus, tabular numbers, and reduced-motion rules. Bottom navigation contains exactly two labelled routes.

### Task 5: Реализовать главную и список программ

**Files:**
- Replace: `app/pages/index.vue`
- Create: `app/pages/programs/index.vue`
- Create: `app/features/training-programs/components/TodayWorkoutCard.vue`
- Create: `app/features/training-programs/components/RestDayCard.vue`
- Create: `app/features/training-programs/components/UpcomingProgramCard.vue`
- Create: `app/features/training-programs/components/ProgramCard.vue`
- Create: `app/features/training-programs/components/GroupedSetSummary.vue`
- Create: `app/features/training-programs/components/ProgramList.vue`
- Create: `app/features/training-programs/components/HomeScreen.vue`
- Create: `app/features/training-programs/components/HomeScreen.test.ts`
- Create: `app/features/training-programs/components/ProgramList.test.ts`

**Interfaces:**
- Consumes: program cache, catalog lookup, date/grouping helpers.
- Produces: complete `/` and `/programs` surfaces.

- [ ] **Step 1: RED — test both home states**

  Assert exact texts «Сегодня тренировка» and «Сегодня отдыхаем», localized Moscow date, exercise count, next-program rollover, create action, and absence of `~45 минут` in both states.

- [ ] **Step 2: GREEN — implement thin home route and focused cards**

  Keep orchestration in `HomeScreen`; cards receive typed props and emit `start`, `open`, or `create`. Handle no future program without fabricating a card.

- [ ] **Step 3: RED — test list states and sorting**

  Assert only returned programs render, weekday order is ascending, empty CTA is unique, loading skeleton reserves height, error offers «Повторить», and clicking a card routes to detail.

- [ ] **Step 4: GREEN — implement list and presentation components**

  Resolve names through catalog, use `GroupedSetSummary`, truncate only visually while preserving accessible names, and restore recorded scroll position on return.

### Task 6: Реализовать общую create/edit форму программы

**Files:**
- Create: `app/pages/programs/new.vue`
- Create: `app/pages/programs/[id]/edit.vue`
- Create: `app/features/training-programs/components/ProgramForm.vue`
- Create: `app/features/training-programs/components/WeekdaySelector.vue`
- Create: `app/features/training-programs/components/ExercisePicker.vue`
- Create: `app/features/training-programs/components/PlannedExerciseEditor.vue`
- Create: `app/features/training-programs/components/PlannedSetRow.vue`
- Create: `app/features/training-programs/components/ProgramForm.test.ts`
- Create: `app/features/training-programs/components/PlannedExerciseEditor.test.ts`

**Interfaces:**
- Consumes: shared draft composable and mappings.
- Produces: create/edit forms emitting validated `CreateTrainingProgramInput` or `UpdateTrainingProgramInput`.

- [ ] **Step 1: RED — test weekday, catalog, and exercise ordering behavior**

  Assert occupied weekdays are disabled with accessible explanation, edit weekday is locked/read-only, duplicate exercises are excluded, drag reorder changes array order, and move-up/down provides the same accessible result.

- [ ] **Step 2: GREEN — implement selector, picker, and ordered editor**

  Use visible labels, native drag events plus move buttons, catalog loading/error/unavailable states, and no production fallback catalog.

- [ ] **Step 3: RED — test set row behavior and field errors**

  Assert add copies the previous populated row, empty copies remain empty, individual deletion works, last delete is disabled, cap is 100, comma weight is accepted, invalid repetition/precision errors are linked via `aria-describedby`, and submit focuses the first error.

- [ ] **Step 4: GREEN — implement set rows and form validation**

  Use `inputmode="numeric"`/`decimal`, stable keys, immutable draft operations, 44 px icon buttons with dynamic aria-labels, and `role="alert"` summaries.

- [ ] **Step 5: RED/GREEN — connect create and edit mutations**

  Test exact POST payload, exact PUT payload without weekday, disabled submit during requests, retained draft after 422/409, success toast, cache refresh, and redirect to detail. Implement thin route containers and reuse the same form.

### Task 7: Реализовать просмотр, удаление и запуск active session

**Files:**
- Create: `app/pages/programs/[id]/index.vue`
- Create: `app/pages/workout-session.vue`
- Create: `app/features/training-programs/components/ProgramDetail.vue`
- Create: `app/features/training-programs/components/DeleteProgramSheet.vue`
- Create: `app/features/training-programs/components/ProgramDetail.test.ts`
- Create: `app/features/training-programs/components/DeleteProgramSheet.test.ts`
- Create: `app/features/workout-sessions/api/sessions.ts`
- Create: `app/features/workout-sessions/composables/useActiveWorkoutSession.ts`
- Create: `app/features/workout-sessions/components/ActiveWorkoutHandoff.vue`
- Create: `app/features/workout-sessions/composables/useActiveWorkoutSession.test.ts`

**Interfaces:**
- Consumes: program/session DTOs, cache, grouping helper, `apiRequest`.
- Produces: detail/delete/start behavior and minimal active-session route.

- [ ] **Step 1: RED — test detail and not-found states**

  Assert immutable weekday, ordered exercises, adjacent grouping, edit/start/delete actions, fallback exercise labels, and clear 404 return action.

- [ ] **Step 2: GREEN — implement detail and session start**

  Start with exact `{ training_program_id: id }`, lock duplicate submits, accept authoritative session response, and navigate to `/workout-session`.

- [ ] **Step 3: RED — test all delete dismissal paths and single submission**

  Assert «Нет», backdrop, Escape, and Telegram Back do not call DELETE; repeated confirm clicks call DELETE exactly once; pending state disables controls; success routes to list and invalidates cache.

- [ ] **Step 4: GREEN — implement accessible bottom sheet**

  Use Nuxt UI modal/drawer primitives with focus management, exact Russian copy, red confirm action, and safe progress announcement.

- [ ] **Step 5: RED/GREEN — cover start/session conflict errors**

  Test `active_workout_session_already_exists` routing to the returned/refetched active session, mutation-in-progress copy, and safe retry behavior.

### Task 8: Завершить responsive/E2E проверку и документацию

**Files:**
- Create: `tests/e2e/training-schedule.spec.ts`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `.ai-factory/DESCRIPTION.md`
- Modify: `.ai-factory/ARCHITECTURE.md`
- Modify: `.env.example`

**Interfaces:**
- Consumes: all completed routes and test fixtures.
- Produces: reproducible acceptance suite and accurate project map.

- [x] **Step 1: RED — add full mocked-Telegram E2E journeys**

  Cover home training/rest, list/empty/error, create/edit, delete cancel/confirm, 401 re-auth, 404, 409, 422, keyboard traversal, and absence of `~45 минут`. Run focused Playwright and confirm failures before fixing integration gaps.

- [x] **Step 2: GREEN — resolve integration and responsive gaps**

  Run at 320/375/430 px, use long program/exercise names and 200% text zoom, assert no horizontal overflow, bottom navigation/sheet safe-area padding, and minimum bounding boxes of 44 px for primary controls.

- [x] **Step 3: Perform visual comparison against all six PNGs**

  Capture deterministic screenshots for home workout, home rest, list, create, detail, and edit. Compare hierarchy, spacing, type scale, card radii, green/red semantics, and record only the spec-approved deviations in the final handoff.

- [x] **Step 4: Update factual documentation**

  Document scripts, BFF cookie flow, new feature directories/routes, `NUXT_API_BASE`, test commands, and the `GET /api/exercises` integration. Preserve the contents of the existing user-authored `docs/training-schedule.md` and `docs/workout-session.md` unless a link-only correction is required.

- [x] **Step 5: Run the complete verification matrix**

  Run:

  ```bash
  pnpm format:check
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:e2e
  pnpm build
  ```

  Expected: every command exits 0 without errors. Then run `git diff --check` and inspect `git status --short` to confirm only intended files changed.

- [x] **Step 6: Record external acceptance limitation truthfully**

  Attempt real Telegram WebView validation only if a deployed HTTPS Mini App URL and bot configuration are available. If absent, report it as unverified and do not claim full production acceptance; separately report that the exercise catalog endpoint remains a backend blocker.
