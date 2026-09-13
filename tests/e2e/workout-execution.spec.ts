import { expect, test, type Page } from '@playwright/test'
import type { PlannedSetInput, TrainingProgram, WorkoutSession } from '../../shared/types/api-tren'

const set = { position: 1, repetitions: 10, working_weight_kg: 40 }
function sessionFixture(): WorkoutSession {
  return {
    id: 9, training_program_id: 1, program_name: 'Силовая тренировка', scheduled_weekday: 7,
    status: 'in_progress', started_at: '2026-09-13T10:00:00Z', completed_at: null, cancelled_at: null,
    exercises: ['Жим лёжа', 'Тяга блока', 'Приседания'].map((name, index) => ({
      exercise_id: (index + 1) * 10, position: index + 1, name, status: 'pending', planned_sets: [{ ...set }], sets: [{ ...set }],
    })),
  }
}

async function setup(page: Page, existing = true) {
  const initial = sessionFixture()
  const state = {
    active: existing ? initial : null as WorkoutSession | null,
    starts: 0, saves: [] as { exerciseId: number, sets: PlannedSetInput[] }[],
    programSaves: 0, actions: [] as string[],
    history: [] as WorkoutSession[],
    program: { id: 1, weekday: 7, name: initial.program_name, exercises: initial.exercises.map(exercise => ({ exercise_id: exercise.exercise_id, position: exercise.position, sets: exercise.planned_sets })) } as TrainingProgram,
  }
  await page.addInitScript(() => {
    window.Telegram = { WebApp: { initData: 'test', ready() {} } }
  })
  await page.route('**/api/auth', route => route.fulfill({ json: { authenticated: true } }))
  await page.route('**/api/api-tren/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/api-tren', '')
    const method = route.request().method()
    if (path === '/exercises') return route.fulfill({ json: { data: initial.exercises.map(exercise => ({ id: exercise.exercise_id, name: exercise.name })) } })
    if (path === '/training-programs') return route.fulfill({ json: { data: [state.program] } })
    if (path === '/training-programs/1' && method === 'PUT') {
      state.programSaves++
      state.program = { ...state.program, ...route.request().postDataJSON() }
      state.program.exercises.forEach(exercise => { exercise.sets = exercise.sets.map((row, i) => ({ ...row, position: i + 1 })) })
      return route.fulfill({ json: { data: state.program } })
    }
    if (path === '/workout-sessions/active') {
      if (method === 'PUT') {
        state.starts++
        expect(route.request().postDataJSON()).toEqual({ training_program_id: 1 })
        state.active = sessionFixture()
        state.active.exercises.forEach((exercise, index) => {
          exercise.sets = structuredClone(state.program.exercises[index]!.sets)
          exercise.planned_sets = structuredClone(exercise.sets)
        })
      }
      return route.fulfill({ json: { data: state.active } })
    }
    if (path === '/workout-sessions') return route.fulfill({ json: { data: state.history, links: { prev: null, next: null }, meta: { per_page: 15, prev_cursor: null, next_cursor: null } } })
    const match = path.match(/^\/workout-sessions\/\d+\/exercises\/(\d+)\/(sets|complete|skip|reopen)$/)
    if (match && state.active) {
      const exerciseId = Number(match[1]); const action = match[2]!
      const exercise = state.active.exercises.find(item => item.exercise_id === exerciseId)!
      expect(method).toBe(action === 'sets' ? 'PUT' : 'POST')
      if (action === 'sets' || action === 'complete') {
        const body = route.request().postDataJSON() as { sets: PlannedSetInput[] }
        expect(Object.keys(body)).toEqual(['sets'])
        expect(body.sets.every(row => Object.keys(row).sort().join(',') === 'repetitions,working_weight_kg')).toBe(true)
        exercise.sets = body.sets.map((row, i) => ({ ...row, position: i + 1 }))
        if (action === 'sets') state.saves.push({ exerciseId, sets: body.sets })
      }
      if (action === 'complete') exercise.status = 'completed'
      if (action === 'skip') { exercise.status = 'skipped'; exercise.sets = [] }
      if (action === 'reopen') {
        if (exercise.status === 'skipped') exercise.sets = structuredClone(exercise.planned_sets)
        exercise.status = 'pending'
      }
      state.actions.push(action)
      return route.fulfill({ json: { data: state.active } })
    }
    if (/\/workout-sessions\/9\/(complete|cancel)$/.test(path) && state.active) {
      expect(method).toBe('POST')
      const value = structuredClone(state.active)
      value.status = path.endsWith('/complete') ? 'completed' : 'cancelled'
      if (value.status === 'completed') expect(value.exercises.every(exercise => exercise.status !== 'pending')).toBe(true)
      state.actions.push(value.status)
      state.history.unshift(value)
      state.active = null
      return route.fulfill({ json: { data: value } })
    }
    return route.fulfill({ status: 404, json: { code: 'not_found' } })
  })
  return state
}

test('preparation edits the program only on save and starts only on confirmation', async ({ page }) => {
  const state = await setup(page, false)
  await page.goto('/programs/1')
  await page.getByRole('button', { name: 'Начать тренировку', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Перед тренировкой' })).toBeVisible()
  expect(state.starts).toBe(0)
  await page.getByRole('button', { name: 'Изменить подходы: Жим лёжа' }).click()
  const modal = page.getByRole('dialog')
  await modal.getByLabel('Повторы').fill('12')
  await modal.getByRole('button', { name: 'Отмена', exact: true }).click()
  expect(state.programSaves).toBe(0)
  await page.getByRole('button', { name: 'Изменить подходы: Жим лёжа' }).click()
  await expect(modal.getByLabel('Повторы')).toHaveValue('10')
  await modal.getByRole('button', { name: 'Добавить подход' }).click()
  await modal.getByLabel('Повторы').nth(1).fill('12')
  await modal.getByLabel('Вес, кг').nth(1).fill('42,5')
  await page.screenshot({ path: test.info().outputPath('preparation-modal.png'), fullPage: true })
  await modal.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(modal).toBeHidden()
  expect(state.programSaves).toBe(1)
  expect(state.program.exercises[0]!.sets[1]).toMatchObject({ repetitions: 12, working_weight_kg: 42.5 })
  await page.getByRole('button', { name: 'Подтвердить и начать' }).click()
  await expect(page).toHaveURL(/\/workout-session$/)
  await expect(page.getByRole('region', { name: 'Жим лёжа' }).getByLabel('Повторы')).toHaveCount(2)
  expect(state.starts).toBe(1)
})

test('early finish explains remaining exercises without submitting the session', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/workout-session')
  const finish = page.getByRole('button', { name: 'Завершить тренировку', exact: true })
  await expect(finish).toBeEnabled()
  await finish.click()
  const modal = page.getByRole('dialog')
  await expect(modal).toContainText('Чтобы завершить тренировку, завершите или пропустите все оставшиеся упражнения.')
  expect(state.actions).toEqual([])
  await page.screenshot({ path: test.info().outputPath('unfinished-workout.png'), fullPage: true, animations: 'disabled' })
  await modal.getByRole('button', { name: 'Продолжить тренировку', exact: true }).click()
  await expect(modal).toBeHidden()
  await expect(finish).toBeFocused()
  await finish.click()
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
  await expect(finish).toBeFocused()
})

for (const lastAction of ['Завершить упражнение', 'Пропустить упражнение']) {
  test(`last remaining exercise focuses finish after ${lastAction}`, async ({ page }) => {
    const state = await setup(page)
    // The last remaining exercise need not be last in the carousel.
    state.active!.exercises[1]!.status = 'completed'
    state.active!.exercises[2]!.status = 'skipped'
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/workout-session')
    const finish = page.getByRole('button', { name: 'Завершить тренировку', exact: true })
    await page.getByRole('region', { name: 'Жим лёжа' }).getByRole('button', { name: lastAction, exact: true }).click()
    await expect(finish).toBeFocused()
    await expect(finish).toBeInViewport()
    await expect(page.getByRole('status').filter({ hasText: 'Можно завершить тренировку' })).toBeVisible()
    expect(state.active?.status).toBe('in_progress')
    await page.screenshot({ path: test.info().outputPath('workout-ready.png'), fullPage: true, animations: 'disabled' })
    await page.getByRole('region', { name: 'Жим лёжа' }).getByRole('button', { name: 'Продолжить упражнение' }).click()
    await expect(page.getByText('Можно завершить тренировку', { exact: true })).toBeHidden()
    await finish.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(state.active?.status).toBe('in_progress')
  })
}

test('closing the final carousel card does not focus finish while earlier exercises remain', async ({ page }) => {
  await setup(page)
  await page.goto('/workout-session')
  await page.getByRole('button', { name: /Упражнение 3:/ }).click()
  await page.getByRole('region', { name: 'Приседания' }).getByRole('button', { name: 'Пропустить упражнение' }).click()
  await expect(page.getByRole('button', { name: /Упражнение 1:/ })).toHaveAttribute('aria-current', 'step')
  await expect(page.getByRole('button', { name: 'Завершить тренировку', exact: true })).not.toBeFocused()
  await expect(page.getByText('Можно завершить тренировку', { exact: true })).toBeHidden()
})

test('exercise workflow saves edits, completes, skips, reopens and finishes into history', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/workout-session')
  const first = page.getByRole('region', { name: 'Жим лёжа' })
  await first.getByLabel('Повторы').fill('12')
  await first.getByLabel('Вес, кг').fill('42,5')
  await first.getByRole('button', { name: 'Добавить подход' }).click()
  await expect.poll(() => state.saves.length).toBe(3)
  await first.getByRole('button', { name: 'Удалить подход 2' }).click()
  await expect.poll(() => state.active?.exercises[0]?.sets.length).toBe(1)
  await page.screenshot({ path: test.info().outputPath('workout-exercise.png'), fullPage: true })
  await first.getByRole('button', { name: 'Завершить упражнение', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Тяга блока' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Упражнение 2:/ })).toHaveAttribute('aria-current', 'step')
  await page.getByRole('region', { name: 'Тяга блока' }).getByRole('button', { name: 'Пропустить упражнение' }).click()
  await page.getByRole('button', { name: /Упражнение 2:/ }).click()
  await page.getByRole('region', { name: 'Тяга блока' }).getByRole('button', { name: 'Продолжить упражнение' }).click()
  await expect(page.getByRole('region', { name: 'Тяга блока' }).getByLabel('Повторы')).toHaveValue('10')
  await page.getByRole('region', { name: 'Тяга блока' }).getByRole('button', { name: 'Завершить упражнение', exact: true }).click()
  await page.getByRole('region', { name: 'Приседания' }).getByRole('button', { name: 'Пропустить упражнение' }).click()
  await page.getByRole('button', { name: 'Завершить тренировку', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Тренировка завершена' })).toBeVisible()
  expect(state.active).toBeNull()
  await page.getByRole('link', { name: 'История тренировок', exact: true }).click()
  await expect(page.getByText('Завершена', { exact: true })).toBeVisible()
  await page.getByText('Результаты упражнений').click()
  const result = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Жим лёжа', exact: true }) })
  await expect(result).toContainText('1×12')
  await expect(result).toContainText('42,5 кг')
})

test('home resumes a session after reload and cancel requires explicit confirmation', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/')
  await page.getByRole('link', { name: 'Продолжить тренировку' }).click()
  await expect(page).toHaveURL(/\/workout-session$/)
  await page.reload()
  await expect(page.getByRole('region', { name: 'Жим лёжа' })).toBeVisible()
  await page.getByRole('button', { name: 'Отменить тренировку', exact: true }).click()
  expect(state.active).not.toBeNull()
  await page.getByRole('dialog').getByRole('button', { name: 'Продолжить', exact: true }).click()
  expect(state.active).not.toBeNull()
  await page.getByRole('button', { name: 'Отменить тренировку', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Да, отменить' }).click()
  await expect(page.getByRole('heading', { name: 'Тренировка отменена' })).toBeVisible()
  expect(state.active).toBeNull()
  expect(state.starts).toBe(0)
})

test('slow autosave preserves later inputs while freely switching slides', async ({ page }) => {
  const state = await setup(page)
  let release!: () => void
  const gate = new Promise<void>((resolve) => { release = resolve })
  let count = 0
  await page.route('**/workout-sessions/9/exercises/10/sets', async (route) => {
    if (++count === 1) await gate
    await route.fallback()
  })
  await page.goto('/workout-session')
  const first = page.getByRole('region', { name: 'Жим лёжа' })
  await first.getByLabel('Повторы').fill('11')
  await first.getByLabel('Повторы').fill('13')
  await page.getByRole('button', { name: /Упражнение 2:/ }).click()
  await page.getByRole('region', { name: 'Тяга блока' }).getByLabel('Вес, кг').fill('55')
  release()
  await expect.poll(() => state.saves.length).toBe(3)
  expect(state.saves.map(save => save.exerciseId)).toEqual([10, 10, 20])
  await page.getByRole('button', { name: /Упражнение 1:/ }).click()
  await expect(first.getByLabel('Повторы')).toHaveValue('13')
  await page.reload()
  await expect(first.getByLabel('Повторы')).toHaveValue('13')
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)
})

test('failed save retains the draft and requires explicit retry; invalid input never reaches the API', async ({ page }) => {
  const state = await setup(page)
  let attempts = 0
  await page.route('**/workout-sessions/9/exercises/10/sets', async (route) => {
    if (++attempts === 1) return route.fulfill({ status: 409, json: { code: 'workout_session_mutation_in_progress' } })
    return route.fallback()
  })
  await page.goto('/workout-session')
  const first = page.getByRole('region', { name: 'Жим лёжа' })
  await first.getByLabel('Повторы').fill('')
  await expect(first.getByText('Целое число от 1')).toBeVisible()
  expect(attempts).toBe(0)
  await first.getByLabel('Повторы').fill('15')
  await expect(page.getByRole('button', { name: 'Повторить сохранение' })).toBeVisible()
  await expect(first.getByLabel('Повторы')).toHaveValue('15')
  await expect(first.getByRole('button', { name: 'Завершить упражнение', exact: true })).toBeDisabled()
  expect(attempts).toBe(1)
  await page.getByRole('button', { name: 'Повторить сохранение' }).click()
  await expect.poll(() => state.saves.length).toBe(1)
  await expect(first.getByText('Все изменения сохранены')).toBeVisible()
  expect(state.active?.exercises[0]?.sets[0]?.repetitions).toBe(15)
})

test('history paginates using the opaque cursor and preserves prior results on retry', async ({ page }) => {
  await setup(page)
  let secondAttempts = 0
  const first = { ...sessionFixture(), status: 'completed', program_name: 'Первая тренировка' }
  const second = { ...sessionFixture(), id: 8, status: 'cancelled', program_name: 'Вторая тренировка' }
  await page.route('**/api/api-tren/workout-sessions?*', async (route) => {
    const cursor = new URL(route.request().url()).searchParams.get('cursor')
    if (cursor) {
      expect(cursor).toBe('opaque+/=cursor')
      if (++secondAttempts === 1) return route.fulfill({ status: 503 })
    }
    return route.fulfill({ json: { data: cursor ? [second] : [first], links: { prev: null, next: null }, meta: { per_page: 15, prev_cursor: null, next_cursor: cursor ? null : 'opaque+/=cursor' } } })
  })
  await page.goto('/workout-history')
  await expect(page.getByRole('heading', { name: 'Первая тренировка' })).toBeVisible()
  await page.getByRole('button', { name: 'Показать ещё' }).click()
  // GET transport may retry once; either way the first page must remain visible.
  if (await page.getByRole('button', { name: 'Повторить', exact: true }).isVisible()) await page.getByRole('button', { name: 'Повторить', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Вторая тренировка' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Первая тренировка' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Показать ещё' })).toBeHidden()
})

test('swiping changes the active number and completed exercises can be reopened', async ({ page }) => {
  const state = await setup(page)
  state.active!.exercises[0]!.status = 'completed'
  await page.goto('/workout-session')
  await expect(page.getByRole('button', { name: /Упражнение 2:/ })).toHaveAttribute('aria-current', 'step')
  const heading = page.getByRole('region', { name: 'Тяга блока' }).getByRole('heading')
  const box = (await heading.boundingBox())!
  await page.mouse.move(box.x + box.width - 5, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 5, box.y + box.height / 2, { steps: 20 })
  await page.mouse.up()
  await expect(page.getByRole('button', { name: /Упражнение 3:/ })).toHaveAttribute('aria-current', 'step')
  await page.getByRole('button', { name: /Упражнение 1:/ }).click()
  const first = page.getByRole('region', { name: 'Жим лёжа' })
  await expect(first.getByLabel('Повторы')).toBeDisabled()
  await first.getByRole('button', { name: 'Продолжить упражнение' }).click()
  await expect(first.getByLabel('Повторы')).toBeEnabled()
  expect(state.active?.exercises[0]?.status).toBe('pending')
})

test('removing every actual set persists empty progress across reload', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/workout-session')
  const first = page.getByRole('region', { name: 'Жим лёжа' })
  await first.getByRole('button', { name: 'Удалить подход 1' }).click()
  await expect.poll(() => state.saves.length).toBe(1)
  expect(state.saves[0]?.sets).toEqual([])
  await page.reload()
  await expect(first.getByText('Подходов пока нет')).toBeVisible()
  await expect(first.getByRole('button', { name: 'Завершить упражнение', exact: true })).toBeDisabled()
})

test('recovery into a replacement session resumes autosaving', async ({ page }) => {
  const state = await setup(page)
  await page.route('**/workout-sessions/9/exercises/10/sets', route => route.fulfill({ status: 409, json: { code: 'workout_session_not_in_progress' } }))
  await page.goto('/workout-session')
  const first = page.getByRole('region', { name: 'Жим лёжа' })
  await first.getByLabel('Повторы').fill('15')
  await expect(page.getByRole('button', { name: 'Повторить сохранение' })).toBeVisible()
  state.active = { ...sessionFixture(), id: 11 }
  await page.getByRole('button', { name: 'Повторить сохранение' }).click()
  await expect(first.getByLabel('Повторы')).toHaveValue('10')
  await first.getByLabel('Повторы').fill('16')
  await expect.poll(() => state.saves.length).toBe(1)
  await expect(first.getByText('Все изменения сохранены')).toBeVisible()
})

test('server validation is attached to the set and the latest draft survives', async ({ page }) => {
  await setup(page)
  await page.route('**/workout-sessions/9/exercises/10/sets', route => route.fulfill({ status: 422, json: { message: 'Validation error', errors: { 'sets.0.working_weight_kg': ['Проверьте рабочий вес'] } } }))
  await page.goto('/workout-session')
  const first = page.getByRole('region', { name: 'Жим лёжа' })
  await first.getByLabel('Вес, кг').fill('55')
  await expect(first.getByText('Проверьте рабочий вес')).toBeVisible()
  await expect(first.getByLabel('Вес, кг')).toHaveValue('55')
  await expect(first.getByLabel('Вес, кг')).toHaveAttribute('aria-invalid', 'true')
})

test('reauthentication during program save preserves the modal draft and validation errors', async ({ page }) => {
  await setup(page, false)
  let attempts = 0
  await page.route('**/api/api-tren/training-programs/1', (route) => {
    attempts++
    return route.fulfill(attempts === 1
      ? { status: 401, json: { message: 'Unauthenticated' } }
      : { status: 422, json: { errors: { 'exercises.0.sets.0.repetitions': ['Проверьте повторения'] } } })
  })
  await page.goto('/workout-session/prepare?programId=1')
  await page.getByRole('button', { name: 'Изменить подходы: Жим лёжа' }).click()
  const modal = page.getByRole('dialog')
  await modal.getByLabel('Повторы').fill('15')
  await modal.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(modal.getByText('Проверьте повторения')).toBeVisible()
  await expect(modal.getByLabel('Повторы')).toHaveValue('15')
  expect(attempts).toBe(2)
})
