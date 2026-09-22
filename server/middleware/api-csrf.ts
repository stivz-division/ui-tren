import { createError, defineEventHandler, getHeader, getRequestURL } from 'h3'

export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  // h3 decodes event.path before routing; originalUrl may still contain %61 etc.
  const pathname = event.path.split('?')[0]!
  const protectedPath = /^\/api\/(?:auth\/?$|api-tren(?:\/|$))/.test(pathname)
  if (!protectedPath || ['GET', 'HEAD'].includes(event.method)) return

  // Custom headers require a CORS preflight; this BFF does not grant cross-origin access.
  // Fetches made by our document inside Telegram's iframe are still same-origin.
  const origin = getHeader(event, 'origin')
  const site = getHeader(event, 'sec-fetch-site')
  if (
    getHeader(event, 'x-ui-tren-request') !== '1'
    || (origin !== undefined && origin !== url.origin)
    || (site !== undefined && site !== 'same-origin')
  ) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden request origin' })
  }
})
