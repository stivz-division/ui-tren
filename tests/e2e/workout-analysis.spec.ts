import { expect, test, type Page } from '@playwright/test'
import { analysisFixture, recommendationFixture } from '../fixtures/analysis'
import type { WorkoutSession } from '../../shared/types/api-tren'

function historySession(id = 9, programId = 1, status: WorkoutSession['status'] = 'completed'): WorkoutSession {
  return {
    id, training_program_id: programId, program_name: 'Силовая тренировка', scheduled_weekday: 7,
    status, started_at: '2026-09-13T10:00:00Z', completed_at: '2026-09-13T11:00:00Z', cancelled_at: null,
    exercises: [{ exercise_id: 10, name: 'Жим лёжа', position: 1, status: 'completed', planned_sets: recommendationFixture().original_sets, sets: recommendationFixture().original_sets }],
  }
}

async function setup(page: Page) {
  const state = {
    analysis: analysisFixture(), history: [historySession()], secondPage: [] as WorkoutSession[],
    active: null as WorkoutSession | null, starts: 0, actions: [] as string[], analysisReads: 0, historyReads: [] as string[],
    analysisError: 0, actionError: 0, activeReadError: 0, historyError: false, actionDelay: 0,
    plan: recommendationFixture().original_sets,
  }
  await page.addInitScript(() => { window.Telegram = { WebApp: { initData: 'test', ready() {} } } })
  await page.route('**/api/auth', route => route.fulfill({ json: { authenticated: true } }))
  await page.route('**/api/api-tren/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace('/api/api-tren', '')
    const method = route.request().method()
    if (path === '/training-programs') return route.fulfill({ json: { data: [{ id: 1, name: 'Силовая тренировка', weekday: 7, exercises: [{ exercise_id: 10, position: 1, sets: state.plan }] }] } })
    if (path === '/exercises') return route.fulfill({ json: { data: [{ id: 10, name: 'Жим лёжа' }, { id: 20, name: 'Жим гантелей' }] } })
    if (path === '/workout-sessions') {
      state.historyReads.push(url.search)
      expect(url.searchParams.has('training_program_id')).toBe(false)
      if (state.historyError) return route.fulfill({ status: 503, json: {} })
      const next = state.secondPage.length > 0 && !url.searchParams.has('cursor')
      return route.fulfill({ json: { data: url.searchParams.has('cursor') ? state.secondPage : state.history, links: { prev: null, next: next ? '?cursor=page2' : null }, meta: { per_page: 15, prev_cursor: null, next_cursor: next ? 'page2' : null } } })
    }
    if (path === '/workout-sessions/9/analysis') {
      state.analysisReads++
      if (state.analysisError) return route.fulfill({ status: state.analysisError, json: {} })
      return route.fulfill({ json: { data: state.analysis } })
    }
    if (path === '/workout-sessions/active') {
      if (method === 'GET' && state.activeReadError) return route.fulfill({ status: state.activeReadError, json: {} })
      if (method === 'PUT') {
        state.starts++
        state.actions.push('start')
        state.active = historySession(11, 1, 'in_progress')
        state.active.exercises[0]!.status = 'pending'
        state.active.exercises[0]!.planned_sets = structuredClone(state.plan)
        state.active.exercises[0]!.sets = structuredClone(state.plan)
        state.analysis.recommendation_generation?.items?.forEach((item) => { if (item.status === 'proposed') item.status = 'expired' })
      }
      return route.fulfill({ json: { data: state.active } })
    }
    if (/^\/workout-recommendations\/31\/(apply|reject)$/.test(path)) {
      expect(method).toBe('POST')
      expect(route.request().postData()).toBeNull()
      const action = path.endsWith('apply') ? 'apply' : 'reject'
      state.actions.push(action)
      if (state.actionDelay) await new Promise(resolve => setTimeout(resolve, state.actionDelay))
      if (state.actionError) {
        if (state.actionError === 409) state.analysis.recommendation_generation!.items![0]!.status = 'expired'
        if (state.actionError === -1) return route.abort('failed')
        return route.fulfill({ status: state.actionError, json: {} })
      }
      const item = state.analysis.recommendation_generation!.items![0]!
      item.status = action === 'apply' ? 'applied' : 'rejected'
      if (action === 'apply') state.plan = structuredClone(item.proposed_sets)
      return route.fulfill({ json: { data: item } })
    }
    return route.fulfill({ status: 404, json: {} })
  })
  return state
}

test('history loads analysis lazily, preserves independent blocks, safe paragraphs and set units', async ({ page }) => {
  const state = await setup(page)
  state.analysis.ai_analysis!.result!.current_workout = '<script>alert(1)</script>\n\nСохраняйте технику.'
  state.analysis.result!.exercises[0]!.set_comparisons.push({ position: 2, planned: null, actual: { position: 2, repetitions: 8, working_weight_kg: 42.5 } })
  await page.goto('/workout-history')
  await expect(page.getByRole('link', { name: 'Анализ тренировки', exact: true })).toBeVisible()
  expect(state.analysisReads).toBe(0)
  await page.getByRole('link', { name: 'Анализ тренировки', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Вывод по тренировке', exact: true })).toContainText('<script>alert(1)</script>')
  await expect(page.getByRole('region', { name: 'В контексте истории', exact: true })).toContainText('первая тренировка')
  await page.locator('summary', { hasText: 'Жим лёжа' }).click()
  const comparison = page.getByRole('region', { name: 'План и факт', exact: true })
  await expect(comparison).toContainText('План не выполнен')
  await expect(comparison).toContainText('Нет подхода')
  await expect(comparison).toContainText('42,5 кг')
  await expect(comparison).toContainText('400')
  await expect(comparison).toContainText('—')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: test.info().outputPath('analysis.png'), fullPage: true })
})

for (const failedStage of ['comparison', 'conclusion', 'recommendations']) {
  test(`keeps available results when ${failedStage} fails and stops null-stage polling`, async ({ page }) => {
    const state = await setup(page)
    state.analysis.overall_status = 'failed'
    if (failedStage === 'comparison') {
      state.analysis.status = 'failed'; state.analysis.result = null; state.analysis.ai_analysis = null; state.analysis.recommendation_generation = null
    }
    if (failedStage === 'conclusion') {
      state.analysis.ai_analysis = { status: 'failed', failure_code: 'internal', result: null }; state.analysis.recommendation_generation = null
    }
    if (failedStage === 'recommendations') state.analysis.recommendation_generation = { status: 'failed', failure_code: 'internal', items: null, no_change_reason: null, rejected_reasons: { internal: 'secret' } }
    await page.clock.install()
    await page.goto('/workout-analysis/9')
    await expect(page.getByText(failedStage === 'comparison' ? 'Не удалось сравнить план и факт' : failedStage === 'conclusion' ? 'Не удалось подготовить заключение' : 'Не удалось подготовить рекомендации', { exact: true }).first()).toBeVisible()
    if (failedStage !== 'comparison') await expect(page.getByRole('region', { name: 'План и факт', exact: true })).toContainText('400')
    if (failedStage === 'recommendations') await expect(page.getByRole('region', { name: 'Вывод по тренировке', exact: true })).toContainText('Текущая тренировка.')
    const reads = state.analysisReads
    await page.clock.fastForward(60000)
    expect(state.analysisReads).toBe(reads)
    await expect(page.locator('body')).not.toContainText('internal')
  })
}

test('polls comparison, conclusion and recommendation stages until the full chain completes', async ({ page }) => {
  const state = await setup(page)
  const ready = structuredClone(state.analysis)
  state.analysis.status = 'pending'; state.analysis.overall_status = 'pending'; state.analysis.result = null; state.analysis.ai_analysis = null; state.analysis.recommendation_generation = null
  await page.clock.install()
  await page.goto('/workout-analysis/9')
  await expect(page.getByText('Ожидает обработки', { exact: true })).toBeVisible()
  state.analysis.status = 'processing'
  await page.clock.fastForward(5000)
  await expect(page.getByText('Подготавливаем…', { exact: true })).toBeVisible()
  state.analysis.status = 'completed'; state.analysis.result = ready.result; state.analysis.overall_status = 'processing'
  state.analysis.ai_analysis = { status: 'pending', result: null, failure_code: null }
  await page.clock.fastForward(7000)
  await expect(page.getByRole('region', { name: 'Вывод по тренировке', exact: true })).toContainText('Ожидает обработки')
  state.analysis.ai_analysis.status = 'processing'
  await page.clock.fastForward(10000)
  await expect(page.getByRole('region', { name: 'Вывод по тренировке', exact: true })).toContainText('Подготавливаем…')
  state.analysis.ai_analysis = ready.ai_analysis
  state.analysis.recommendation_generation = { ...ready.recommendation_generation!, status: 'pending', items: null }
  await page.clock.fastForward(15000)
  await expect(page.getByRole('region', { name: 'Рекомендации', exact: true })).toContainText('Ожидает обработки')
  state.analysis.recommendation_generation.status = 'processing'
  await page.clock.fastForward(22000)
  await expect(page.getByRole('region', { name: 'Рекомендации', exact: true })).toContainText('Подготавливаем…')
  state.analysis = ready
  await page.clock.fastForward(22000)
  await expect(page.getByRole('button', { name: 'Применить', exact: true })).toBeVisible()
  const reads = state.analysisReads
  await page.clock.fastForward(60000)
  expect(state.analysisReads).toBe(reads)
})

test('404 is unavailable, completed empty items explain why, null items are not empty', async ({ page }) => {
  const state = await setup(page)
  state.analysisError = 404
  await page.goto('/workout-analysis/9')
  await expect(page.getByText('Анализ этой тренировки недоступен.')).toBeVisible()
  state.analysisError = 0
  state.analysis.recommendation_generation!.items = []
  state.analysis.recommendation_generation!.no_change_reason = 'Текущий план подходит для следующей тренировки.'
  await page.getByRole('button', { name: 'Обновить', exact: true }).click()
  await expect(page.getByText('Текущий план подходит для следующей тренировки.')).toBeVisible()
  state.analysis.recommendation_generation!.items = null
  await page.getByRole('button', { name: 'Обновить', exact: true }).click()
  await expect(page.getByText('Результат пока недоступен')).toBeVisible()
  await expect(page.getByText('Текущий план подходит для следующей тренировки.')).toBeHidden()
})

test('finds a later history page, applies before start and uses the updated server snapshot', async ({ page }) => {
  const state = await setup(page)
  state.secondPage = state.history
  state.history = [historySession(10, 2)]
  state.actionDelay = 400
  await page.goto('/workout-session/prepare?programId=1')
  const apply = page.getByRole('button', { name: 'Применить', exact: true })
  await expect(apply).toBeEnabled()
  expect(state.starts).toBe(0)
  expect(state.historyReads.some(query => query.includes('cursor=page2'))).toBe(true)
  await apply.dblclick()
  await expect(page.getByRole('button', { name: 'Подтвердить и начать', exact: true })).toBeDisabled()
  await expect(page.getByText('Изменения применены к программе', { exact: true })).toBeVisible()
  expect(state.actions).toEqual(['apply'])
  await page.getByRole('button', { name: 'Подтвердить и начать', exact: true }).click()
  await expect(page).toHaveURL(/\/workout-session$/)
  expect(state.actions).toEqual(['apply', 'start'])
  expect(state.active!.exercises[0]!.planned_sets[0]!.working_weight_kg).toBe(42.5)
  expect(state.history[0]!.exercises[0]!.planned_sets[0]!.working_weight_kg).toBe(40)
  expect(state.analysis.result!.exercises[0]!.planned_sets[0]!.working_weight_kg).toBe(40)
})

test('confirms start without applying, never auto-rejects and expires cached offers', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/workout-session/prepare?programId=1')
  await expect(page.getByRole('button', { name: 'Применить', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Подтвердить и начать' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Неприменённые рекомендации станут неактуальны после начала тренировки')
  expect(state.starts).toBe(0)
  await dialog.getByRole('button', { name: 'Вернуться к предложениям' }).click()
  await page.getByRole('button', { name: 'Подтвердить и начать' }).click()
  await dialog.getByRole('button', { name: 'Начать с текущим планом', exact: true }).click()
  await expect(page).toHaveURL(/\/workout-session$/)
  expect(state.actions).toEqual(['start'])
  await page.getByRole('button', { name: 'Назад', exact: true }).click()
  await page.getByRole('link', { name: 'История', exact: true }).click()
  await page.getByRole('link', { name: 'Анализ тренировки', exact: true }).click()
  await expect(page.getByText('Больше не актуально', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Применить', exact: true })).toBeHidden()
})

test('newer cancelled session blocks older offers; active session continues without creation', async ({ page }) => {
  const state = await setup(page)
  state.history.unshift(historySession(10, 1, 'cancelled'))
  await page.goto('/workout-session/prepare?programId=1')
  await expect(page.getByRole('button', { name: 'Подтвердить и начать' })).toBeEnabled()
  expect(state.analysisReads).toBe(0)
  state.active = historySession(11, 1, 'in_progress')
  await page.reload()
  await page.getByRole('link', { name: 'Продолжить тренировку', exact: true }).click()
  await expect(page).toHaveURL(/\/workout-session$/)
  expect(state.starts).toBe(0)
})

test('reject updates status without changing the plan, replacement comes from the catalog', async ({ page }) => {
  const state = await setup(page)
  state.analysis.recommendation_generation!.items![0]!.change_type = 'replacement'
  state.analysis.recommendation_generation!.items![0]!.replacement_exercise_id = 20
  await page.goto('/workout-analysis/9')
  await expect(page.getByText('Заменить на: Жим гантелей')).toBeVisible()
  await page.getByRole('button', { name: 'Отклонить', exact: true }).click()
  await expect(page.getByText('Отклонено', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Применить', exact: true })).toBeHidden()
  expect(state.plan).toEqual(recommendationFixture().original_sets)
})

for (const error of [409, -1]) {
  test(`reconciles ${error === 409 ? 'conflicts' : 'network failures'} before offering any retry`, async ({ page }) => {
    const state = await setup(page)
    state.actionError = error
    await page.goto('/workout-analysis/9')
    await page.getByRole('button', { name: 'Применить', exact: true }).click()
    await expect(page.getByText(error === 409 ? /Рекомендация уже обработана/ : /Не удалось подтвердить результат действия/)).toBeVisible()
    expect(state.analysisReads).toBeGreaterThan(1)
    await expect(page.getByText('Изменения применены к программе', { exact: true })).toBeHidden()
    if (error === 409) await expect(page.getByRole('button', { name: 'Применить', exact: true })).toBeHidden()
    else await expect(page.getByRole('button', { name: 'Применить', exact: true })).toBeEnabled()
  })
}

test('prestart load errors and pending analysis allow explicit start with the current plan', async ({ page }) => {
  const state = await setup(page)
  state.historyError = true
  await page.goto('/workout-session/prepare?programId=1')
  await expect(page.getByText(/Не удалось загрузить рекомендации/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Начать с текущим планом', exact: true })).toBeEnabled()
  state.historyError = false
  state.analysis.recommendation_generation!.status = 'processing'
  state.analysis.recommendation_generation!.items = null
  state.analysis.overall_status = 'processing'
  await page.getByRole('button', { name: 'Повторить проверку' }).click()
  await expect(page.getByText('Подготавливаем…', { exact: true })).toBeVisible()
  expect(state.starts).toBe(0)
  await page.getByRole('button', { name: 'Начать с текущим планом', exact: true }).click()
  await expect(page).toHaveURL(/\/workout-session$/)
  expect(state.actions).toEqual(['start'])
})

test('analysis adapts to light, dark, landscape, tablet and enlarged text', async ({ page }) => {
  await setup(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/workout-analysis/9')
  await expect(page.getByRole('button', { name: 'Применить', exact: true })).toBeVisible()
  for (const viewport of [{ width: 375, height: 812, dark: false }, { width: 812, height: 375, dark: true }, { width: 768, height: 1024, dark: true }]) {
    await page.setViewportSize(viewport)
    await page.emulateMedia({ colorScheme: viewport.dark ? 'dark' : 'light' })
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    const apply = page.getByRole('button', { name: 'Применить', exact: true })
    await apply.scrollIntoViewIfNeeded()
    const bounds = await apply.boundingBox()
    expect(bounds?.height).toBeGreaterThanOrEqual(44)
    expect(await apply.locator('span').last().evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    await page.screenshot({ path: test.info().outputPath(`analysis-${viewport.width}-${viewport.dark ? 'dark' : 'light'}.png`), fullPage: true, animations: 'disabled' })
  }
})

test('failed active-session check cannot be bypassed by starting with the current plan', async ({ page }) => {
  const state = await setup(page)
  state.activeReadError = 503
  await page.goto('/workout-session/prepare?programId=1')
  await expect(page.getByText(/Не удалось проверить активную тренировку/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Начать с текущим планом', exact: true })).toBeDisabled()
  expect(state.starts).toBe(0)
  state.activeReadError = 0
  state.active = historySession(11, 2, 'in_progress')
  await page.getByRole('button', { name: 'Повторить проверку' }).click()
  await page.getByRole('link', { name: 'Продолжить тренировку', exact: true }).click()
  await expect(page).toHaveURL(/\/workout-session$/)
  expect(state.starts).toBe(0)
})
