import { expect, test } from '@playwright/test'

function currentMoscowWeekday(): number {
  const short = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Moscow', weekday: 'short' }).format(new Date())
  return { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[short] ?? 1
}

test.beforeEach(async ({ page }) => {
  const weekday = currentMoscowWeekday()
  const nextWeekday = weekday === 7 ? 1 : weekday + 1
  await page.addInitScript(() => {
    const testWindow = window as typeof window & { __telegramBackHandler?: () => void }
    window.Telegram = {
      WebApp: {
        initData: 'browser-init-data',
        initDataUnsafe: { user: { first_name: 'Алексей' } },
        ready() {},
        BackButton: {
          show() {},
          hide() {},
          onClick(handler) { testWindow.__telegramBackHandler = handler },
          offClick(handler) {
            if (testWindow.__telegramBackHandler === handler) testWindow.__telegramBackHandler = undefined
          },
        },
      },
    }
  })
  await page.route('**/api/auth', route => route.fulfill({ json: { authenticated: true } }))
  await page.route('**/api/api-tren/exercises', route => route.fulfill({ json: { data: [
    { id: 10, name: 'Жим лёжа' }, { id: 20, name: 'Тяга верхнего блока' },
  ] } }))
  await page.route('**/api/api-tren/training-programs', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { data: [
        { id: 2, weekday: nextWeekday, name: 'Спина и бицепс с длинным названием', exercises: [{ exercise_id: 20, position: 1, sets: [{ position: 1, repetitions: 10, working_weight_kg: 60 }] }] },
        { id: 1, weekday, name: 'Грудь и трицепс', exercises: [{ exercise_id: 10, position: 1, sets: [{ position: 1, repetitions: 6, working_weight_kg: 100 }, { position: 2, repetitions: 6, working_weight_kg: 100 }, { position: 3, repetitions: 3, working_weight_kg: 140 }] }] },
      ] } })
      return
    }
    await route.continue()
  })
})

test('home shows today workout without estimated duration and only two tabs', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Сегодня тренировка' })).toBeVisible()
  await expect(page.getByText('Грудь и трицепс')).toBeVisible()
  await expect(page.getByText('~45 минут')).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Основная навигация' }).getByRole('link')).toHaveCount(2)
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(overflow).toBe(false)
})

test('auth loading state never flashes protected content', async ({ page }) => {
  let finishAuthentication: (() => void) | undefined
  const authenticationGate = new Promise<void>((resolve) => {
    finishAuthentication = resolve
  })
  await page.unroute('**/api/auth')
  await page.route('**/api/auth', async (route) => {
    await authenticationGate
    await route.fulfill({ json: { authenticated: true } })
  })

  await page.goto('/')
  await expect(page.getByText('Загружаем расписание…')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Сегодня тренировка' })).toBeHidden()
  finishAuthentication?.()
  await expect(page.getByRole('heading', { name: 'Сегодня тренировка' })).toBeVisible()
})

test('a protected 401 triggers one reauthentication and one retry', async ({ page }) => {
  let authRequests = 0
  let programRequests = 0
  await page.unroute('**/api/auth')
  await page.route('**/api/auth', async (route) => {
    authRequests += 1
    await route.fulfill({ json: { authenticated: true } })
  })
  await page.unroute('**/api/api-tren/training-programs')
  await page.route('**/api/api-tren/training-programs', async (route) => {
    programRequests += 1
    if (programRequests === 1) {
      await route.fulfill({ status: 401, json: { code: 'unauthenticated' } })
      return
    }
    await route.fulfill({ json: { data: [] } })
  })

  await page.goto('/programs')
  await expect(page.getByRole('heading', { name: 'Программ пока нет' })).toBeVisible()
  expect(authRequests).toBe(2)
  expect(programRequests).toBe(2)
})

test('program list is sorted and renders grouped adjacent sets', async ({ page }) => {
  await page.goto('/programs')
  const cards = page.locator('main').getByRole('link').filter({ has: page.locator('h2') })
  const weekday = currentMoscowWeekday()
  const nextWeekday = weekday === 7 ? 1 : weekday + 1
  await expect(cards.first()).toContainText(weekday < nextWeekday ? 'Грудь и трицепс' : 'Спина и бицепс')
  await expect(cards.filter({ hasText: 'Грудь и трицепс' })).toContainText('2×6 100 кг, 1×3 140 кг')
  await expect(page.getByText('~45 минут')).toHaveCount(0)
})

test('create form exposes accessible weekday and set controls', async ({ page }) => {
  await page.goto('/programs/new')
  await expect(page.getByRole('heading', { name: 'Новая тренировка' })).toBeVisible()
  await page.getByRole('button', { name: 'Добавить упражнение' }).click()
  await page.getByRole('combobox', { name: 'Упражнение', exact: true }).selectOption('10')
  await page.getByLabel('Повторы').fill('6')
  await page.getByLabel('Вес, кг').fill('90,5')
  await page.getByRole('button', { name: 'Добавить подход' }).click()
  await expect(page.getByLabel('Удалить подход 2')).toBeEnabled()
  await expect(page.getByLabel('Удалить подход 1')).toBeEnabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)
})

test('create sends ordered sets without positions', async ({ page }) => {
  let submittedBody: Record<string, unknown> | undefined
  await page.route('**/api/api-tren/training-programs', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }
    submittedBody = route.request().postDataJSON() as Record<string, unknown>
    await route.fulfill({ json: { data: { id: 3, ...submittedBody } } })
  })

  await page.goto('/programs/new')
  const occupied = [currentMoscowWeekday(), currentMoscowWeekday() === 7 ? 1 : currentMoscowWeekday() + 1]
  const available = [1, 2, 3, 4, 5, 6, 7].find(day => !occupied.includes(day))!
  const weekdayLabels = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  await page.getByRole('button', { name: weekdayLabels[available] }).click()
  await page.getByRole('button', { name: 'Добавить упражнение' }).click()
  await page.getByRole('combobox', { name: 'Упражнение', exact: true }).selectOption('10')
  await page.getByLabel('Повторы').fill('6')
  await page.getByLabel('Вес, кг').fill('90,5')
  await page.getByRole('button', { name: 'Добавить подход' }).click()
  await page.getByRole('button', { name: 'Создать тренировку' }).click()
  await expect(page).toHaveURL(/\/programs\/3$/)

  expect(submittedBody).toEqual({
    weekday: available,
    name: 'Тренировка',
    exercises: [{
      exercise_id: 10,
      sets: [
        { repetitions: 6, working_weight_kg: 90.5 },
        { repetitions: 6, working_weight_kg: 90.5 },
      ],
    }],
  })

  await page.getByRole('button', { name: 'Назад' }).click()
  await expect(page).toHaveURL(/\/programs\/new$/)
  await expect(page.getByLabel('Название')).toHaveValue('Тренировка')
  await expect(page.getByRole('combobox', { name: 'Упражнение', exact: true })).toHaveCount(0)
})

test('exercises can be reordered with the drag handle', async ({ page }) => {
  await page.goto('/programs/new')
  await page.getByRole('button', { name: 'Добавить упражнение' }).click()
  await page.getByRole('combobox', { name: 'Упражнение', exact: true }).selectOption('10')
  await page.getByRole('button', { name: 'Добавить упражнение' }).click()
  const selects = page.getByRole('combobox', { name: 'Упражнение', exact: true })
  await selects.nth(1).selectOption('20')

  const dataTransfer = await page.evaluateHandle(() => new DataTransfer())
  await page.getByRole('button', { name: 'Перетащить упражнение 1' }).dispatchEvent('dragstart', { dataTransfer })
  await page.locator('[data-exercise-index="1"]').dispatchEvent('drop', { dataTransfer })
  await expect(selects.nth(0)).toHaveValue('20')
  await expect(selects.nth(1)).toHaveValue('10')
  await expect(page.getByText('Упражнение «Жим лёжа» перемещено на позицию 2')).toHaveAttribute('aria-live', 'polite')
})

test('invalid submit focuses the first field error', async ({ page }) => {
  await page.goto('/programs/new')
  await page.getByRole('button', { name: 'Создать тренировку' }).click()
  await expect(page.locator('fieldset[aria-invalid="true"]')).toBeFocused()
  await expect(page.getByText('Выберите день недели')).toHaveAttribute('role', 'alert')
})

test('Telegram Back confirms discard and clears the create draft', async ({ page }) => {
  await page.goto('/programs/new')
  await page.getByLabel('Название').fill('Несохранённая программа')
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Несохранённые данные будут потеряны')
    await dialog.accept()
  })
  await page.evaluate(() => (window as typeof window & { __telegramBackHandler?: () => void }).__telegramBackHandler?.())
  await expect(page).toHaveURL(/\/programs$/)
  await page.getByRole('link', { name: 'Создать' }).click()
  await expect(page.getByLabel('Название')).toHaveValue('Тренировка')
})

test('home shows the rest state and the next program', async ({ page }) => {
  const nextWeekday = currentMoscowWeekday() === 7 ? 1 : currentMoscowWeekday() + 1
  await page.unroute('**/api/api-tren/training-programs')
  await page.route('**/api/api-tren/training-programs', route => route.fulfill({ json: { data: [
    { id: 2, weekday: nextWeekday, name: 'Спина и бицепс', exercises: [{ exercise_id: 20, position: 1, sets: [{ position: 1, repetitions: 10, working_weight_kg: 60 }] }] },
  ] } }))

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Сегодня отдыхаем' })).toBeVisible()
  await expect(page.getByText('Тренировки на сегодня нет')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Посмотреть программу' })).toBeVisible()
})

test('empty program list shows one creation CTA', async ({ page }) => {
  await page.unroute('**/api/api-tren/training-programs')
  await page.route('**/api/api-tren/training-programs', route => route.fulfill({ json: { data: [] } }))

  await page.goto('/programs')
  await expect(page.getByRole('heading', { name: 'Программ пока нет' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Создать тренировку' })).toHaveCount(1)
})

test('missing program has a clear return state', async ({ page }) => {
  await page.unroute('**/api/api-tren/training-programs')
  await page.route('**/api/api-tren/training-programs', route => route.fulfill({ json: { data: [] } }))

  await page.goto('/programs/999')
  await expect(page.getByText('Программа не найдена')).toBeVisible()
  await expect(page.getByRole('link', { name: 'К списку программ' })).toBeVisible()
})

test('program detail reserves its layout while data is loading', async ({ page }) => {
  let finishLoading: (() => void) | undefined
  const loadingGate = new Promise<void>((resolve) => {
    finishLoading = resolve
  })
  await page.unroute('**/api/api-tren/training-programs')
  await page.route('**/api/api-tren/training-programs', async (route) => {
    await loadingGate
    await route.fulfill({ json: { data: [] } })
  })

  await page.goto('/programs/999')
  await expect(page.getByLabel('Загрузка программы')).toBeVisible()
  await expect(page.getByText('Программа не найдена')).toBeHidden()
  finishLoading?.()
  await expect(page.getByText('Программа не найдена')).toBeVisible()
})

test('server validation keeps the draft and focuses its first field error', async ({ page }) => {
  await page.route('**/api/api-tren/training-programs', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 422,
      json: {
        statusCode: 422,
        data: { errors: { name: ['Название уже занято'] } },
      },
    })
  })

  await page.goto('/programs/new')
  const occupied = [currentMoscowWeekday(), currentMoscowWeekday() === 7 ? 1 : currentMoscowWeekday() + 1]
  const available = [1, 2, 3, 4, 5, 6, 7].find(day => !occupied.includes(day))!
  const weekdayLabels = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  await page.getByRole('button', { name: weekdayLabels[available] }).click()
  await page.getByRole('button', { name: 'Добавить упражнение' }).click()
  await page.getByRole('combobox', { name: 'Упражнение', exact: true }).selectOption('10')
  await page.getByLabel('Повторы').fill('6')
  await page.getByLabel('Вес, кг').fill('90')
  await page.getByRole('button', { name: 'Создать тренировку' }).click()

  await expect(page.getByLabel('Название')).toBeFocused()
  await expect(page.getByText('Название уже занято')).toHaveAttribute('role', 'alert')
  await expect(page.getByLabel('Название')).toHaveValue('Тренировка')
})

test('occupied weekday conflict refreshes days and focuses the selector', async ({ page }) => {
  let collectionReads = 0
  await page.route('**/api/api-tren/training-programs', async (route) => {
    if (route.request().method() === 'GET') {
      collectionReads += 1
      await route.fallback()
      return
    }
    await route.fulfill({ status: 409, json: { code: 'training_program_already_exists' } })
  })

  await page.goto('/programs/new')
  const occupied = [currentMoscowWeekday(), currentMoscowWeekday() === 7 ? 1 : currentMoscowWeekday() + 1]
  const available = [1, 2, 3, 4, 5, 6, 7].find(day => !occupied.includes(day))!
  const weekdayLabels = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  await page.getByRole('button', { name: weekdayLabels[available] }).click()
  await page.getByRole('button', { name: 'Добавить упражнение' }).click()
  await page.getByRole('combobox', { name: 'Упражнение', exact: true }).selectOption('10')
  await page.getByLabel('Повторы').fill('6')
  await page.getByLabel('Вес, кг').fill('90')
  await page.getByRole('button', { name: 'Создать тренировку' }).click()

  await expect(page.locator('fieldset[aria-invalid="true"]')).toBeFocused()
  await expect(page.getByRole('alert').filter({ hasText: 'На выбранный день программа уже создана' })).toBeVisible()
  await expect(page.getByLabel('Название')).toHaveValue('Тренировка')
  expect(collectionReads).toBeGreaterThanOrEqual(2)
})

test('catalog failure has an explicit retry path', async ({ page }) => {
  let catalogRequests = 0
  await page.unroute('**/api/api-tren/exercises')
  await page.route('**/api/api-tren/exercises', async (route) => {
    catalogRequests += 1
    if (catalogRequests <= 2) {
      await route.fulfill({ status: 503 })
      return
    }
    await route.fulfill({ json: { data: [{ id: 10, name: 'Жим лёжа' }] } })
  })

  await page.goto('/programs/new')
  await expect(page.getByText('Не удалось загрузить каталог')).toBeVisible()
  await page.getByRole('button', { name: 'Повторить' }).click()
  await expect(page.getByRole('button', { name: 'Добавить упражнение' })).toBeEnabled()
  expect(catalogRequests).toBe(3)
})

test('set validation errors are associated with their inputs', async ({ page }) => {
  await page.goto('/programs/new')
  const occupied = [currentMoscowWeekday(), currentMoscowWeekday() === 7 ? 1 : currentMoscowWeekday() + 1]
  const available = [1, 2, 3, 4, 5, 6, 7].find(day => !occupied.includes(day))!
  const weekdayLabels = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  await page.getByRole('button', { name: weekdayLabels[available] }).click()
  await page.getByRole('button', { name: 'Добавить упражнение' }).click()
  await page.getByRole('combobox', { name: 'Упражнение', exact: true }).selectOption('10')
  await page.getByRole('button', { name: 'Создать тренировку' }).click()

  const repetitions = page.getByLabel('Повторы')
  const weight = page.getByLabel('Вес, кг')
  const repetitionsErrorId = await repetitions.getAttribute('aria-describedby')
  const weightErrorId = await weight.getAttribute('aria-describedby')
  expect(repetitionsErrorId).toBeTruthy()
  expect(weightErrorId).toBeTruthy()
  await expect(page.locator(`#${repetitionsErrorId}`)).toHaveAttribute('role', 'alert')
  await expect(page.locator(`#${weightErrorId}`)).toHaveAttribute('role', 'alert')
})

test('edit replaces name and exercises without weekday', async ({ page }) => {
  let submittedBody: Record<string, unknown> | undefined
  await page.route('**/api/api-tren/training-programs/1', async (route) => {
    submittedBody = route.request().postDataJSON() as Record<string, unknown>
    await route.fulfill({ json: { data: {
      id: 1,
      weekday: currentMoscowWeekday(),
      ...submittedBody,
    } } })
  })

  await page.goto('/programs/1/edit')
  await page.getByLabel('Название').fill('Обновлённая тренировка')
  await page.getByRole('button', { name: 'Сохранить изменения' }).click()
  await expect(page).toHaveURL(/\/programs\/1$/)

  expect(submittedBody).not.toHaveProperty('weekday')
  expect(submittedBody).toMatchObject({
    name: 'Обновлённая тренировка',
    exercises: [{
      exercise_id: 10,
      sets: [
        { repetitions: 6, working_weight_kg: 100 },
        { repetitions: 6, working_weight_kg: 100 },
        { repetitions: 3, working_weight_kg: 140 },
      ],
    }],
  })
})

test('edit 404 closes the stale editor and returns to the list', async ({ page }) => {
  await page.route('**/api/api-tren/training-programs/1', route => route.fulfill({
    status: 404,
    json: { code: 'training_program_not_found' },
  }))

  await page.goto('/programs/1/edit')
  await page.getByLabel('Название').fill('Устаревшая программа')
  await page.getByRole('button', { name: 'Сохранить изменения' }).click()
  await expect(page).toHaveURL(/\/programs$/)
  await expect(page.getByRole('heading', { name: 'Программа' })).toBeVisible()
})

test('workout start 404 closes the stale program', async ({ page }) => {
  await page.route('**/api/api-tren/workout-sessions/active', route => route.fulfill({
    status: 404,
    json: { code: 'training_program_not_found' },
  }))

  await page.goto('/programs/1')
  await page.getByRole('button', { name: 'Начать тренировку' }).click()
  await expect(page).toHaveURL(/\/programs$/)
  await expect(page.getByRole('heading', { name: 'Программа' })).toBeVisible()
})

test('visible form controls meet the minimum touch target', async ({ page }) => {
  await page.goto('/programs/new')
  await page.getByRole('button', { name: 'Добавить упражнение' }).click()
  const undersized = await page.locator('button:visible, a:visible, input:visible, select:visible').evaluateAll((elements) => (
    elements
      .map((element) => {
        const rect = element.getBoundingClientRect()
        return { label: element.getAttribute('aria-label') ?? element.textContent?.trim(), width: rect.width, height: rect.height }
      })
      .filter(rect => rect.width < 44 || rect.height < 44)
  ))
  expect(undersized).toEqual([])
})

test('large system text keeps the mobile page free of horizontal scrolling', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await expect(page.getByRole('heading', { name: 'Сегодня тренировка' })).toBeVisible()
  const overflowingElements = await page.locator('body *').evaluateAll((elements) => (
    elements
      .map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          element: `${element.tagName.toLowerCase()}.${element.className}`,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          text: element.textContent?.trim().slice(0, 80),
        }
      })
      .filter(element => element.left < 0 || element.right > document.documentElement.clientWidth)
  ))
  expect(overflowingElements).toEqual([])
})

test('delete is cancelled by No and sent exactly once after confirmation', async ({ page }) => {
  let deleteRequests = 0
  await page.route('**/api/api-tren/training-programs/1', async (route) => {
    deleteRequests += 1
    await route.fulfill({ status: 204 })
  })
  await page.unroute('**/api/api-tren/training-programs')
  await page.route('**/api/api-tren/training-programs', route => route.fulfill({ json: { data: deleteRequests === 0 ? [
    { id: 1, weekday: currentMoscowWeekday(), name: 'Грудь и трицепс', exercises: [{ exercise_id: 10, position: 1, sets: [{ position: 1, repetitions: 6, working_weight_kg: 100 }] }] },
  ] : [] } }))

  await page.goto('/programs/1')
  await page.getByRole('button', { name: 'Удалить тренировку' }).click()
  await expect(page.getByRole('heading', { name: 'Удалить тренировку?' })).toBeVisible()
  await page.getByRole('button', { name: 'Нет' }).click()
  expect(deleteRequests).toBe(0)

  await page.getByRole('button', { name: 'Удалить тренировку' }).click()
  await page.evaluate(() => (window as typeof window & { __telegramBackHandler?: () => void }).__telegramBackHandler?.())
  await expect(page.getByRole('heading', { name: 'Удалить тренировку?' })).toBeHidden()
  expect(deleteRequests).toBe(0)

  await page.getByRole('button', { name: 'Удалить тренировку' }).click()
  await page.getByRole('button', { name: 'Да, удалить' }).click()
  await expect(page).toHaveURL(/\/programs$/)
  expect(deleteRequests).toBe(1)
})

test('delete can be retried after a mutation conflict', async ({ page }) => {
  let deleteRequests = 0
  let finishReconciliation: (() => void) | undefined
  const reconciliationGate = new Promise<void>((resolve) => {
    finishReconciliation = resolve
  })
  await page.route('**/api/api-tren/training-programs/1', async (route) => {
    deleteRequests += 1
    if (deleteRequests === 1) {
      await route.fulfill({ status: 409, json: { code: 'training_program_mutation_in_progress' } })
      return
    }
    await route.fulfill({ status: 204 })
  })
  await page.unroute('**/api/api-tren/training-programs')
  await page.route('**/api/api-tren/training-programs', async (route) => {
    if (deleteRequests === 1) await reconciliationGate
    await route.fulfill({ json: { data: deleteRequests < 2 ? [
      { id: 1, weekday: currentMoscowWeekday(), name: 'Грудь и трицепс', exercises: [{ exercise_id: 10, position: 1, sets: [{ position: 1, repetitions: 6, working_weight_kg: 100 }] }] },
    ] : [] } })
  })

  await page.goto('/programs/1')
  await page.getByRole('button', { name: 'Удалить тренировку' }).click()
  await page.getByRole('button', { name: 'Да, удалить' }).click()
  await expect(page.getByRole('button', { name: 'Да, удалить' })).toBeDisabled()
  finishReconciliation?.()
  await expect(page.getByText('Изменение расписания уже выполняется. Повторите попытку.', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Да, удалить' })).toBeEnabled()

  await page.getByRole('button', { name: 'Да, удалить' }).click()
  await expect(page).toHaveURL(/\/programs$/)
  expect(deleteRequests).toBe(2)
})
