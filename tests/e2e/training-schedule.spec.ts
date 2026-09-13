import { expect, test, type Page } from '@playwright/test'

async function selectExercise(page: Page, name: string, index = 0) {
  await page.getByRole('button', { name: 'Упражнение', exact: true }).nth(index).click()
  await page.getByRole('option', { name, exact: true }).click()
  await expect(page.getByRole('option')).toHaveCount(0)
}

const fixtureWeekday = 7
const fixtureTime = new Date('2026-09-13T13:00:00Z')

test.use({ timezoneId: 'Asia/Bangkok' })

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: fixtureTime })
  const weekday = fixtureWeekday
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
  await page.route('**/api/api-tren/workout-sessions/active', route => route.fulfill({ json: { data: null } }))
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

test('home greets the user by Bangkok time without hydration errors', async ({ page }) => {
  const hydrationErrors: string[] = []
  page.on('console', message => {
    if (/hydration/i.test(message.text())) hydrationErrors.push(message.text())
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Добрый вечер, Алексей')
  await expect(page.getByText('Воскресенье, 13 сентября')).toBeVisible()
  expect(hydrationErrors).toEqual([])
})

test('home updates the local date and today workout across midnight', async ({ page }) => {
  await page.clock.setSystemTime(new Date('2026-09-13T16:59:30Z'))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Сегодня тренировка' })).toBeVisible()
  await expect(page.getByText('Воскресенье, 13 сентября')).toBeVisible()
  await page.clock.runFor(60_000)
  await expect(page.getByText('Понедельник, 14 сентября')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Сегодня тренировка' })).toContainText('Спина и бицепс с длинным названием')
  await expect(page.getByRole('region', { name: 'Следующая тренировка' })).toContainText('Грудь и трицепс')
})

test('home refreshes the greeting immediately when the app becomes visible', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Добрый вечер, Алексей')
  await page.clock.setSystemTime(new Date('2026-09-13T23:00:00Z'))
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Доброе утро, Алексей')
  await expect(page.getByText('Понедельник, 14 сентября')).toBeVisible()
})

test('home shows today workout without estimated duration and three navigation tabs', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Сегодня тренировка' })).toBeVisible()
  await expect(page.getByText('Грудь и трицепс')).toBeVisible()
  await expect(page.getByText('~45 минут')).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Основная навигация' }).getByRole('link')).toHaveCount(3)
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
  const weekday = fixtureWeekday
  const nextWeekday = weekday === 7 ? 1 : weekday + 1
  await expect(cards.first()).toContainText(weekday < nextWeekday ? 'Грудь и трицепс' : 'Спина и бицепс')
  const chestCard = cards.filter({ hasText: 'Грудь и трицепс' })
  await expect(chestCard).toContainText('2×6')
  await expect(chestCard).toContainText('Рабочий вес: 100 кг')
  await expect(chestCard).toContainText('1×3')
  await expect(chestCard).toContainText('Рабочий вес: 140 кг')
  await expect(page.getByText('~45 минут')).toHaveCount(0)
})

test('create form exposes accessible weekday and set controls', async ({ page }) => {
  await page.goto('/programs/new')
  await expect(page.getByRole('heading', { name: 'Новая тренировка' })).toBeVisible()
  await page.getByRole('button', { name: 'Добавить упражнение' }).click()
  await selectExercise(page, 'Жим лёжа')
  await page.getByLabel('Повторы').fill('6')
  await page.getByLabel('Вес, кг').fill('90,5')
  await page.getByRole('button', { name: 'Добавить подход' }).click()
  await expect(page.getByLabel('Удалить подход 2')).toBeEnabled()
  await expect(page.getByLabel('Удалить подход 1')).toBeEnabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)
})

for (const origin of ['/', '/programs', '/programs/new']) {
  test(`create sends ordered sets and preserves Back navigation from ${origin}`, async ({ page }) => {
    let submittedBody: Record<string, unknown> | undefined
    await page.route('**/api/api-tren/training-programs', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback()
        return
      }
      submittedBody = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({ json: { data: { id: 3, ...submittedBody } } })
    })

    await page.goto(origin)
    if (origin !== '/programs/new') await page.locator('a[href="/programs/new"]').click()
    const occupied = [fixtureWeekday, fixtureWeekday === 7 ? 1 : fixtureWeekday + 1]
    const available = [1, 2, 3, 4, 5, 6, 7].find(day => !occupied.includes(day))!
    const weekdayLabels = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    await page.getByRole('button', { name: weekdayLabels[available] }).click()
    await page.getByRole('button', { name: 'Добавить упражнение' }).click()
    await selectExercise(page, 'Жим лёжа')
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
    await expect(page).toHaveURL(origin === '/programs/new' ? '/programs' : origin)
    await page.locator('a[href="/programs/new"]').click()
    await expect(page).toHaveURL('/programs/new')
    await expect(page.getByLabel('Название')).toHaveValue('Тренировка')
    await expect(page.getByRole('button', { name: 'Упражнение', exact: true })).toHaveCount(0)
  })
}

test('exercises can be reordered with the drag handle', async ({ page }) => {
  await page.goto('/programs/new')
  await page.getByRole('button', { name: 'Добавить упражнение' }).click()
  await selectExercise(page, 'Жим лёжа')
  await page.getByRole('button', { name: 'Добавить упражнение' }).click()
  const selects = page.getByRole('button', { name: 'Упражнение', exact: true })
  await selectExercise(page, 'Тяга верхнего блока', 1)

  const dataTransfer = await page.evaluateHandle(() => new DataTransfer())
  await page.getByRole('button', { name: 'Перетащить упражнение 1' }).dispatchEvent('dragstart', { dataTransfer })
  await page.locator('[data-exercise-index="1"]').dispatchEvent('drop', { dataTransfer })
  await expect(selects.nth(0)).toContainText('Тяга верхнего блока')
  await expect(selects.nth(1)).toContainText('Жим лёжа')
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
  const nextWeekday = fixtureWeekday === 7 ? 1 : fixtureWeekday + 1
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
  const occupied = [fixtureWeekday, fixtureWeekday === 7 ? 1 : fixtureWeekday + 1]
  const available = [1, 2, 3, 4, 5, 6, 7].find(day => !occupied.includes(day))!
  const weekdayLabels = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  await page.getByRole('button', { name: weekdayLabels[available] }).click()
  await page.getByRole('button', { name: 'Добавить упражнение' }).click()
  await selectExercise(page, 'Жим лёжа')
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
  const occupied = [fixtureWeekday, fixtureWeekday === 7 ? 1 : fixtureWeekday + 1]
  const available = [1, 2, 3, 4, 5, 6, 7].find(day => !occupied.includes(day))!
  const weekdayLabels = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  await page.getByRole('button', { name: weekdayLabels[available] }).click()
  await page.getByRole('button', { name: 'Добавить упражнение' }).click()
  await selectExercise(page, 'Жим лёжа')
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
  const occupied = [fixtureWeekday, fixtureWeekday === 7 ? 1 : fixtureWeekday + 1]
  const available = [1, 2, 3, 4, 5, 6, 7].find(day => !occupied.includes(day))!
  const weekdayLabels = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  await page.getByRole('button', { name: weekdayLabels[available] }).click()
  await page.getByRole('button', { name: 'Добавить упражнение' }).click()
  await selectExercise(page, 'Жим лёжа')
  await page.getByLabel('Вес, кг').fill('-1')
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

for (const origin of ['/', '/programs']) {
  test(`saved edits preserve Back navigation to ${origin}`, async ({ page }) => {
    await page.route('**/api/api-tren/training-programs/2', async (route) => {
      const input = route.request().postDataJSON()
      await route.fulfill({ json: { data: {
        id: 2,
        weekday: 1,
        name: input.name,
        exercises: input.exercises.map((exercise: { exercise_id: number, sets: object[] }, index: number) => ({
          ...exercise,
          position: index + 1,
          sets: exercise.sets.map((set, setIndex) => ({ ...set, position: setIndex + 1 })),
        })),
      } } })
    })

    await page.goto(origin)
    await page.locator('a[href="/programs/2"]').click()
    for (let edit = 1; edit <= 2; edit += 1) {
      await page.getByRole('link', { name: 'Редактировать' }).click()
      await page.getByLabel('Название').fill(`Обновлённая тренировка ${edit}`)
      await page.getByRole('button', { name: 'Сохранить изменения' }).click()
      await expect(page).toHaveURL('/programs/2')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Обновлённая тренировка ${edit}`)
    }
    await page.getByRole('button', { name: 'Назад', exact: true }).click()
    await expect(page).toHaveURL(origin)
  })
}

test('edit replaces name and exercises without weekday', async ({ page }) => {
  let submittedBody: Record<string, unknown> | undefined
  await page.route('**/api/api-tren/training-programs/1', async (route) => {
    submittedBody = route.request().postDataJSON() as Record<string, unknown>
    await route.fulfill({ json: { data: {
      id: 1,
      weekday: fixtureWeekday,
      ...submittedBody,
    } } })
  })

  await page.goto('/programs/1/edit')
  await page.getByLabel('Название').fill('Обновлённая тренировка')
  await page.getByRole('button', { name: 'Сохранить изменения' }).click()
  await expect(page).toHaveURL(/\/programs\/1$/)

  await page.getByRole('button', { name: 'Назад', exact: true }).click()
  await expect(page).toHaveURL('/programs')

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
  await page.getByRole('button', { name: 'Подтвердить и начать' }).click()
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
    { id: 1, weekday: fixtureWeekday, name: 'Грудь и трицепс', exercises: [{ exercise_id: 10, position: 1, sets: [{ position: 1, repetitions: 6, working_weight_kg: 100 }] }] },
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
      { id: 1, weekday: fixtureWeekday, name: 'Грудь и трицепс', exercises: [{ exercise_id: 10, position: 1, sets: [{ position: 1, repetitions: 6, working_weight_kg: 100 }] }] },
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


test('exercise search filters names, handles empty results and prevents duplicates', async ({ page }) => {
  await page.goto('/programs/new')
  await page.getByRole('button', { name: 'Добавить упражнение' }).click()
  const picker = page.getByRole('button', { name: 'Упражнение', exact: true }).first()
  await picker.click()
  const search = page.getByPlaceholder('Поиск упражнения…')
  await search.fill('Несуществующее')
  await expect(page.getByText('Упражнения не найдены')).toBeVisible()
  await search.fill('ЖИМ')
  await expect(page.getByRole('option', { name: 'Жим лёжа', exact: true })).toBeVisible()
  await expect(page.getByRole('option', { name: 'Тяга верхнего блока' })).toHaveCount(0)
  await search.press('ArrowDown')
  await search.press('Enter')
  await expect(search).toBeHidden()
  await expect(picker).toContainText('Жим лёжа')
  await page.getByRole('button', { name: 'Добавить упражнение' }).click()
  await page.getByRole('button', { name: 'Упражнение', exact: true }).nth(1).click()
  await expect(search).toHaveValue('')
  await expect(page.getByRole('option', { name: 'Жим лёжа', exact: true })).toHaveCount(0)
  await search.press('Escape')
  await expect(picker).toContainText('Жим лёжа')
})

test('reorder buttons keep exercise sets together and respect reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/programs/new')
  await page.getByRole('button', { name: 'Добавить упражнение' }).click()
  await selectExercise(page, 'Жим лёжа')
  await page.getByLabel('Повторы').fill('8')
  await page.getByRole('button', { name: 'Добавить упражнение' }).click()
  await selectExercise(page, 'Тяга верхнего блока', 1)
  await page.getByLabel('Повторы').nth(1).fill('12')
  await expect(page.getByRole('button', { name: 'Переместить упражнение 1 выше' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Переместить упражнение 2 ниже' })).toBeDisabled()
  await page.getByRole('button', { name: 'Переместить упражнение 2 выше' }).click()
  await expect(page.getByRole('button', { name: 'Упражнение', exact: true }).first()).toContainText('Тяга верхнего блока')
  await expect(page.getByLabel('Повторы').first()).toHaveValue('12')
  await expect(page.getByLabel('Повторы').nth(1)).toHaveValue('8')
  expect(await page.locator('[data-exercise-index]').evaluateAll(elements => elements.every(element => element.getAnimations().length === 0))).toBe(true)
  await page.getByRole('button', { name: 'Переместить упражнение 1 ниже' }).click()
  await expect(page.getByRole('button', { name: 'Упражнение', exact: true }).first()).toContainText('Жим лёжа')
})

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`adding exercises and sets reveals and focuses the new fields (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion })
    await page.goto('/programs/new')
    const addExercise = page.getByRole('button', { name: 'Добавить упражнение' })
    for (let index = 0; index < 3; index++) await addExercise.click()

    const newCard = page.locator('[data-exercise-index="2"]')
    const picker = newCard.getByRole('button', { name: 'Упражнение', exact: true })
    await expect(picker).toBeFocused()
    await expect(picker).toBeInViewport({ ratio: 1 })
    await expect(newCard.getByRole('button', { name: 'Перетащить упражнение 3' })).toBeInViewport({ ratio: 1 })
    await expect(page.getByRole('option')).toHaveCount(0)

    // Add sets to an earlier card to catch accidental focus on the last exercise.
    const firstCard = page.locator('[data-exercise-index="0"]')
    await firstCard.getByLabel('Повторы').fill('8')
    await firstCard.getByLabel('Вес, кг').fill('50')
    for (let index = 0; index < 6; index++) {
      await firstCard.getByRole('button', { name: 'Добавить подход' }).click()
      const repetitions = firstCard.getByLabel('Повторы').last()
      await expect(repetitions).toBeFocused()
      await expect(repetitions).toBeInViewport({ ratio: 1 })
      await expect(repetitions).toHaveValue('8')
    }
    await expect(firstCard.getByLabel('Повторы')).toHaveCount(7)
    await expect(newCard.getByLabel('Повторы')).toHaveCount(1)
  })
}


test('repetitions copy without weight and empty weights save as zero', async ({ page }) => {
  let submittedBody: Record<string, unknown> | undefined
  await page.route('**/api/api-tren/training-programs/1', async (route) => {
    submittedBody = route.request().postDataJSON() as Record<string, unknown>
    await route.fulfill({ json: { data: { id: 1, weekday: fixtureWeekday, ...submittedBody } } })
  })
  await page.goto('/programs/1/edit')
  const weights = page.getByLabel('Вес, кг')
  await expect(weights).toHaveCount(3)
  for (const weight of await weights.all()) await weight.fill('')
  await page.getByRole('button', { name: 'Добавить подход' }).click()
  await expect(page.getByLabel('Повторы').last()).toHaveValue('3')
  await expect(weights.last()).toHaveValue('')
  await expect(weights.last()).toHaveAttribute('placeholder', '0')
  await page.getByRole('button', { name: 'Сохранить изменения' }).click()
  await expect(page).toHaveURL(/\/programs\/1$/)
  expect(submittedBody).toMatchObject({
    exercises: [{ exercise_id: 10, sets: [
      { repetitions: 6, working_weight_kg: 0 },
      { repetitions: 6, working_weight_kg: 0 },
      { repetitions: 3, working_weight_kg: 0 },
      { repetitions: 3, working_weight_kg: 0 },
    ] }],
  })
})

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`reordering keeps focus and the moved card header in view (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion })
    await page.goto('/programs/new')
    await page.getByRole('button', { name: 'Добавить упражнение' }).click()
    const firstCard = page.locator('[data-exercise-index="0"]')
    for (let index = 0; index < 5; index++) await firstCard.getByRole('button', { name: 'Добавить подход' }).click()
    await page.getByRole('button', { name: 'Добавить упражнение' }).click()
    const key = await page.locator('[data-exercise-index="1"]').getAttribute('data-exercise-key')
    await page.getByRole('button', { name: 'Добавить упражнение' }).click()
    const movedCard = page.locator(`[data-exercise-key="${key}"]`)

    await movedCard.getByRole('button', { name: 'Переместить упражнение 2 выше' }).click()
    await expect(movedCard).toHaveAttribute('data-exercise-index', '0')
    await expect.poll(() => movedCard.evaluate(element => element.contains(document.activeElement))).toBe(true)
    await expect(movedCard.getByRole('button', { name: 'Перетащить упражнение 1' })).toBeInViewport({ ratio: 1 })
    await expect(movedCard.getByRole('button', { name: 'Упражнение', exact: true })).toBeInViewport({ ratio: 1 })

    const down = movedCard.getByRole('button', { name: /Переместить упражнение \d+ ниже/ })
    await down.click()
    await expect(movedCard).toHaveAttribute('data-exercise-index', '1')
    await expect(down).toBeFocused()
    await expect(down).toBeInViewport({ ratio: 1 })
    await down.press('Enter')
    await expect(movedCard).toHaveAttribute('data-exercise-index', '2')
    await expect.poll(() => movedCard.evaluate(element => element.contains(document.activeElement))).toBe(true)
    await expect(movedCard.getByRole('button', { name: 'Перетащить упражнение 3' })).toBeInViewport({ ratio: 1 })
  })
}
