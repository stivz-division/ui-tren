import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.Telegram = { WebApp: {
      initData: 'synthetic-init-data', ready() {},
      BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} },
    } }
  })
})

test('real BFF authenticates inside a cross-site iframe with third-party cookies blocked', async ({ page, context }) => {
  await page.goto('https://localhost:4182')
  const frame = page.frameLocator('iframe')
  await expect(frame.getByRole('heading', { name: 'Программ пока нет' })).toBeVisible()
  const miniApp = page.frames().find(frame => frame.url().startsWith('https://127.0.0.1:4181'))!
  const cdp = await context.newCDPSession(miniApp)
  await cdp.send('Network.enable')
  await cdp.send('Network.setCookieControls', {
    enableThirdPartyCookieRestriction: true,
    disableThirdPartyCookieMetadata: true,
    disableThirdPartyCookieHeuristics: true,
  })
  await context.clearCookies()
  let authRequests = 0
  page.on('request', (request) => { if (new URL(request.url()).pathname === '/api/auth') authRequests += 1 })
  const authenticated = page.waitForResponse(response => response.url().endsWith('/api/auth') && response.status() === 200)
  await miniApp.goto('https://127.0.0.1:4181/programs')
  await authenticated
  await expect(frame.getByRole('heading', { name: 'Программ пока нет' })).toBeVisible()
  const result = await miniApp.evaluate(async () => {
    await fetch('/cookie-control')
    const control = await (await fetch('/cookie-control/check')).json()
    const statuses = await Promise.all(['/training-programs', '/exercises', '/workout-sessions/active'].map(async path => (await fetch(`/api/api-tren${path}`)).status))
    const mutation = await fetch('/api/api-tren/training-programs', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-ui-tren-request': '1' }, body: '{}',
    })
    const csrf = await fetch('/api/api-tren/training-programs', { method: 'POST', body: '{}' })
    const authCsrf = await fetch('/api/auth', { method: 'POST', body: '{}' })
    const encodedAuthCsrf = await fetch('/api/%61uth', { method: 'POST', body: '{}' })
    return { control: control.sent, statuses, mutation: mutation.status, csrf: csrf.status, authCsrf: authCsrf.status, encodedAuthCsrf: encodedAuthCsrf.status, readableCookie: document.cookie.includes('api_tren_session') }
  })
  expect(result).toEqual({ control: false, statuses: [200, 200, 200], mutation: 200, csrf: 403, authCsrf: 403, encodedAuthCsrf: 403, readableCookie: false })
  const cookie = (await context.cookies()).find(cookie => cookie.name === 'api_tren_session')!
  expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: 'None', partitionKey: 'https://localhost' })
  expect(authRequests).toBe(2) // One successful login and the intentional CSRF rejection.
})

test('top-level mobile-sized HTTPS and local HTTP retain working sessions', async ({ page, context }) => {
  for (const origin of ['https://127.0.0.1:4181', 'http://127.0.0.1:4174']) {
    await context.clearCookies()
    // Reproduce an existing installation upgrading from the old unpartitioned cookie.
    await context.addCookies([{ name: 'api_tren_session', value: 'old-synthetic-session', url: origin, httpOnly: true, sameSite: 'Lax' }])
    await page.goto(`${origin}/programs`)
    await expect(page.getByRole('heading', { name: 'Программ пока нет' })).toBeVisible()
    const cookie = (await context.cookies()).find(cookie => cookie.name === 'api_tren_session')!
    expect(cookie.httpOnly).toBe(true)
    expect(cookie.secure).toBe(origin.startsWith('https'))
    expect(cookie.sameSite).toBe(origin.startsWith('https') ? 'None' : 'Lax')
    expect((await context.cookies()).filter(cookie => cookie.name === 'api_tren_session')).toHaveLength(1)
  }
})

test('persistent concurrent 401s stop after one shared recovery, until manual retry', async ({ page }) => {
  let authRequests = 0
  let apiRequests = 0
  page.on('request', (request) => { if (new URL(request.url()).pathname === '/api/auth') authRequests += 1 })
  await page.route('**/api/api-tren/**', async (route) => {
    apiRequests += 1
    await route.fulfill({ status: 401, json: {} })
  })
  await page.goto('https://127.0.0.1:4181/programs')
  await expect(page.getByRole('alert')).toContainText('Не удалось сохранить сессию')
  expect(authRequests).toBe(2)
  const stoppedAt = apiRequests
  // Observation window verifies the absence of watcher-driven login loops.
  await page.waitForTimeout(1000)
  expect(authRequests).toBe(2)
  expect(apiRequests).toBe(stoppedAt)
  await page.unroute('**/api/api-tren/**')
  await page.getByRole('button', { name: 'Повторить', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Программ пока нет' })).toBeVisible()
  expect(authRequests).toBe(3)
})

test('a rate-limited recovery displays an error without automatic auth retries', async ({ page }) => {
  let authRequests = 0
  await page.route('**/api/auth', async (route) => {
    authRequests += 1
    if (authRequests === 1) return route.continue()
    await route.fulfill({ status: 429, json: {} })
  })
  await page.route('**/api/api-tren/**', route => route.fulfill({ status: 401, json: {} }))
  await page.goto('https://127.0.0.1:4181/programs')
  await expect(page.getByRole('alert')).toContainText('Слишком много попыток входа')
  await page.waitForTimeout(1000)
  expect(authRequests).toBe(2)
})
