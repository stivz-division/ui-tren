import { expect, test } from '@playwright/test'
import type { CreateTrainingProgramInput, Exercise } from '../../shared/types/api-tren'

const names = [
  'Жим в Хаммере на низ груди',
  'Тяга Т-грифа',
  'Разгибание ног',
  'Протяжка с нижнего блока',
  'Разгибания с верхнего кроссовера на трицепс с прямой рукояткой',
  'Подъём гантелей на бицепс сидя',
  'Приседания',
]
const catalog: Exercise[] = names.map((name, index) => ({ id: index + 1, name, code: `exercise_${index}`, description: null, video_url: null }))
const example = `1. Жим в Хаммере на низ груди — 3 × 8 — 10 кг
2. Тяга Т грифа — 3 × 8 — 10 кг
3. Разгибание ног — 3 × 10 — 10 кг
4. Протяжка с нижнего блока — 3 × 10 — 10 кг
5. Разгибания с верхнего кроссовера на трицепс с прямой рукояткой — 2 × 8 — 10 кг
6. Подъём гантелей на бицепс сидя — 2 × 8 — 10 кг`

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth', route => route.fulfill({ json: { authenticated: true } }))
  await page.route('**/api/api-tren/training-programs', route => route.fulfill({ json: { data: [] } }))
  await page.route('**/api/api-tren/exercises', route => route.fulfill({ json: { data: catalog } }))
})

test('text import previews six exercises, resolves a suggestion and appends sixteen sets before saving', async ({ page }, testInfo) => {
  let submitted: CreateTrainingProgramInput | undefined
  await page.route('**/api/api-tren/training-programs', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    submitted = route.request().postDataJSON() as CreateTrainingProgramInput
    await route.fulfill({ json: { data: {
      id: 50, ...submitted,
      exercises: submitted.exercises.map((exercise, index) => ({ ...exercise, position: index + 1, sets: exercise.sets.map((set, setIndex) => ({ ...set, position: setIndex + 1 })) })),
    } } })
  })
  await page.goto('/programs/new')
  await page.getByRole('button', { name: 'Пн', exact: true }).click()
  await page.getByLabel('Название', { exact: true }).fill('Моя программа')
  await page.getByRole('button', { name: 'Добавить упражнение', exact: true }).click()
  await page.getByRole('button', { name: 'Упражнение', exact: true }).click()
  await page.getByRole('option', { name: 'Приседания', exact: true }).click()
  await expect(page.getByRole('option')).toHaveCount(0)
  await page.getByLabel('Повторы').fill('5')
  await page.getByLabel('Вес, кг').fill('20')
  await expect(page.getByLabel('Повторы')).toHaveValue('5')
  await expect(page.getByLabel('Вес, кг')).toHaveValue('20')

  await page.getByRole('button', { name: 'Добавить из текста' }).click()
  const dialog = page.getByRole('dialog', { name: 'Добавить из текста' })
  await dialog.getByLabel('Список упражнений').fill(example)
  await dialog.getByRole('button', { name: 'Разобрать', exact: true }).click()
  await expect(dialog.getByText('Упражнений: 6 · Подходов: 16')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Добавить упражнения', exact: true })).toBeDisabled()
  await page.screenshot({ path: testInfo.outputPath('import-preview.png') })
  await dialog.getByRole('button', { name: 'Выбрать: Тяга Т-грифа', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Добавить упражнения', exact: true })).toBeEnabled()
  expect(await dialog.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(false)
  await dialog.getByRole('button', { name: 'Добавить упражнения', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByLabel('Повторы')).toHaveCount(17)
  await expect(page.getByLabel('Повторы').first()).toHaveValue('5')
  await expect(page.getByLabel('Вес, кг').first()).toHaveValue('20')
  expect(submitted).toBeUndefined()
  await page.getByRole('button', { name: 'Добавить из текста' }).click()
  await dialog.getByLabel('Список упражнений').fill('Тяга Т-грифа — 1 × 8 — 10 кг')
  await dialog.getByRole('button', { name: 'Разобрать', exact: true }).click()
  await expect(dialog.getByText('Это упражнение уже добавлено в программу')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Добавить упражнения', exact: true })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Отмена', exact: true }).click()
  await page.getByRole('button', { name: 'Создать тренировку' }).click()
  await expect(page).toHaveURL(/\/programs\/50$/)
  expect(submitted?.name).toBe('Моя программа')
  expect(submitted?.weekday).toBe(1)
  expect(submitted?.exercises.map(exercise => exercise.exercise_id)).toEqual([7, 1, 2, 3, 4, 5, 6])
  expect(submitted?.exercises.map(exercise => exercise.sets.length)).toEqual([1, 3, 3, 3, 3, 2, 2])
  expect(submitted?.exercises[0]?.sets).toEqual([{ repetitions: 5, working_weight_kg: 20 }])
  expect(submitted?.exercises[3]?.sets).toEqual(Array.from({ length: 3 }, () => ({ repetitions: 10, working_weight_kg: 10 })))
})

test('text import retains bad lines, prevents duplicates, searches the catalog and cancels without changing the draft', async ({ page }) => {
  await page.goto('/programs/new')
  await page.getByRole('button', { name: 'Добавить из текста' }).click()
  const dialog = page.getByRole('dialog', { name: 'Добавить из текста' })
  const input = dialog.getByLabel('Список упражнений')
  await input.fill('Тяга Т-грифа — 1 × 8 — 0 кг\nНеверная строка\nТяга Т-грифа — 2 × 8 — 10 кг')
  await dialog.getByRole('button', { name: 'Разобрать', exact: true }).click()
  await expect(dialog.getByText('Неверная строка', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Это упражнение повторяется в тексте')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Добавить упражнения', exact: true })).toBeDisabled()

  await dialog.getByRole('button', { name: 'Изменить текст' }).click()
  await expect(input).toHaveValue('Тяга Т-грифа — 1 × 8 — 0 кг\nНеверная строка\nТяга Т-грифа — 2 × 8 — 10 кг')
  await input.fill('Другое название — 2 х 12 — 10,5 кг')
  await dialog.getByRole('button', { name: 'Разобрать', exact: true }).click()
  await dialog.getByRole('button', { name: 'Упражнение', exact: true }).click()
  await page.getByPlaceholder('Поиск упражнения…').fill('бицепс')
  await page.getByRole('option', { name: names[5], exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Добавить упражнения', exact: true })).toBeEnabled()
  await dialog.getByRole('button', { name: 'Отмена', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByLabel('Повторы')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Добавить из текста' })).toBeFocused()
})

test('text import stays unavailable until the exercise catalog loads and allows retry after failure', async ({ page }) => {
  await page.route('**/api/api-tren/exercises', route => route.fulfill({ status: 404, json: { message: 'Not found' } }))
  await page.goto('/programs/new')
  await expect(page.getByText('Каталог упражнений временно недоступен')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Добавить из текста' })).toBeDisabled()
  await page.route('**/api/api-tren/exercises', route => route.fulfill({ json: { data: catalog } }))
  await page.getByRole('button', { name: 'Повторить', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Добавить из текста' })).toBeEnabled()
})
