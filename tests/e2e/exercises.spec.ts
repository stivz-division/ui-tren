import { expect, test, type Page } from '@playwright/test'
import { analysisFixture } from '../fixtures/analysis'

async function setup(page: Page) {
  const exercises = [
    { id: 10, code: 'bench', name: 'Жим лёжа', description: 'Опустите гриф плавно.\n<script>alert(1)</script>', video_url: 'https://www.youtube.com/watch?v=3K259_IsCgg' },
    { id: 20, code: 'row', name: 'Тяга блока', description: null, video_url: null },
  ]
  const state = { detailError: 0, listError: false, reads: [] as number[], saves: [] as unknown[] }
  const analysis = analysisFixture()
  Object.assign(analysis.recommendation_generation!.items![0]!, { change_type: 'replacement', replacement_exercise_id: 20 })
  await page.addInitScript(() => { window.Telegram = { WebApp: { initData: 'test', ready() {} } } })
  await page.route('**/api/auth', route => route.fulfill({ json: { authenticated: true } }))
  // External player is intentionally isolated: these tests verify our integration, not YouTube availability.
  await page.route('https://www.youtube-nocookie.com/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body>Video player</body></html>' }))
  await page.route('**/api/api-tren/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/api-tren', '')
    if (path === '/exercises') return route.fulfill({ status: state.listError ? 503 : 200, json: { data: exercises } })
    if (/^\/exercises\/\d+$/.test(path)) {
      const id = Number(path.split('/').at(-1))
      state.reads.push(id)
      return route.fulfill({ status: state.detailError || 200, json: state.detailError ? { message: 'Unavailable' } : { data: exercises.find(item => item.id === id) } })
    }
    if (path === '/workout-sessions/9/analysis') return route.fulfill({ json: { data: analysis } })
    if (path === '/workout-sessions/active' || path.endsWith('/sets')) {
      const sets = route.request().method() === 'PUT' ? route.request().postDataJSON().sets : [{ repetitions: 10, working_weight_kg: 40 }]
      if (path.endsWith('/sets')) state.saves.push(sets)
      return route.fulfill({ json: { data: {
        id: 9, training_program_id: 1, program_name: 'Тренировка', scheduled_weekday: 7, status: 'in_progress',
        started_at: '2026-10-03T10:00:00Z', completed_at: null, cancelled_at: null,
        exercises: [{ exercise_id: 10, name: 'Жим лёжа', position: 1, status: 'pending', planned_sets: [{ position: 1, repetitions: 10, working_weight_kg: 40 }], sets: sets.map((set: object, i: number) => ({ ...set, position: i + 1 })) }],
      } } })
    }
    return route.fulfill({ status: 404, json: {} })
  })
  return state
}

test('catalog search opens details with video, preserves search and handles missing media', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/exercises')
  await expect(page.getByRole('heading', { name: 'Упражнения', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Упражнения', exact: true })).toHaveAttribute('aria-current', 'page')
  const search = page.getByRole('searchbox', { name: 'Поиск упражнения' })
  await search.fill('  ЖИМ ЛЕЖА  ')
  await page.getByRole('button', { name: 'Жим лёжа', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Опустите гриф плавно.')
  await expect(dialog).toContainText('<script>alert(1)</script>')
  await expect(dialog.locator('script')).toHaveCount(0)
  await expect(dialog.locator('iframe')).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/3K259_IsCgg?playsinline=1')
  await expect(dialog.getByRole('link', { name: 'Открыть видео' })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=3K259_IsCgg')
  expect(state.reads).toEqual([10])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: test.info().outputPath('exercise-details.png'), fullPage: true, animations: 'disabled' })
  await dialog.getByRole('button', { name: 'Закрыть', exact: true }).click()
  await expect(page.locator('iframe')).toHaveCount(0)
  await expect(search).toHaveValue('  ЖИМ ЛЕЖА  ')
  await search.fill('нет такого упражнения')
  await expect(page.getByText('Ничего не найдено')).toBeVisible()
  await search.fill('тяга')
  await page.getByRole('button', { name: 'Тяга блока', exact: true }).click()
  await expect(dialog).toContainText('Описание пока не добавлено')
  await expect(dialog).toContainText('Видео пока не добавлено')
  await expect(dialog.locator('iframe')).toHaveCount(0)
})

test('catalog and detail failures can be retried; reopening never shows a previous exercise', async ({ page }) => {
  const state = await setup(page)
  state.listError = true
  await page.goto('/exercises')
  await expect(page.getByText('Не удалось загрузить упражнения')).toBeVisible()
  state.listError = false
  await page.getByRole('button', { name: 'Повторить' }).click()
  state.detailError = 404
  await page.getByRole('button', { name: 'Жим лёжа', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Упражнение больше недоступно')
  state.detailError = 503
  await dialog.getByRole('button', { name: 'Повторить' }).click()
  await expect(dialog).toContainText('Сервис временно недоступен')
  state.detailError = 0
  await dialog.getByRole('button', { name: 'Повторить' }).click()
  await expect(dialog).toContainText('Опустите гриф плавно.')
  await dialog.getByRole('button', { name: 'Закрыть', exact: true }).click()
  await page.getByRole('button', { name: 'Тяга блока', exact: true }).click()
  await expect(dialog).not.toContainText('Опустите гриф плавно.')
})

test('session info keeps edited sets and autosave intact', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/workout-session')
  const repetitions = page.getByRole('textbox').first()
  await repetitions.fill('12')
  await page.getByRole('button', { name: 'Об упражнении: Жим лёжа' }).click()
  await expect(page.getByRole('dialog')).toContainText('Опустите гриф плавно.')
  await page.getByRole('dialog').getByRole('button', { name: 'Закрыть', exact: true }).click()
  await expect(repetitions).toHaveValue('12')
  await expect.poll(() => state.saves).toEqual([[{ repetitions: 12, working_weight_kg: 40 }]])
})

test('replacement opens the proposed exercise and analysis hides conclusions', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/workout-analysis/9')
  await page.getByRole('button', { name: 'Посмотреть упражнение', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Тяга блока')
  await expect(page.getByRole('dialog')).toContainText('Описание пока не добавлено')
  expect(state.reads).toEqual([20])
  await expect(page.getByRole('region', { name: 'Вывод по тренировке', exact: true })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'В контексте истории', exact: true })).toHaveCount(0)
})
