import { createServer, request } from 'node:http'
import { createServer as createSecureServer } from 'node:https'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Isolated fake Laravel boundary. No real Telegram data or credentials are used.
const directory = mkdtempSync(join(tmpdir(), 'ui-tren-auth-'))
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', join(directory, 'key.pem'), '-out', join(directory, 'cert.pem'), '-days', '1', '-subj', '/CN=localhost'], { stdio: 'ignore' })
const tls = { key: readFileSync(join(directory, 'key.pem')), cert: readFileSync(join(directory, 'cert.pem')) }
let generation = 0
const servers = []

servers.push(createServer((req, res) => {
  res.setHeader('content-type', 'application/json')
  if (req.url === '/health') return res.end('{}')
  if (req.url === '/api/auth' && req.method === 'POST') {
    generation += 1
    return res.end(JSON.stringify({ token: `synthetic-session-${generation}` }))
  }
  if (req.headers.authorization !== `Bearer synthetic-session-${generation}`) {
    res.statusCode = 401
    return res.end('{}')
  }
  res.end(JSON.stringify({ data: req.url === '/api/workout-sessions/active' ? null : [] }))
}).listen(4180, '127.0.0.1'))

servers.push(createSecureServer(tls, (req, res) => {
  if (req.url === '/cookie-control') {
    res.setHeader('set-cookie', 'unpartitioned_control=1; Secure; SameSite=None; Path=/')
    return res.end('ok')
  }
  if (req.url === '/cookie-control/check') {
    res.setHeader('content-type', 'application/json')
    return res.end(JSON.stringify({ sent: (req.headers.cookie ?? '').includes('unpartitioned_control=') }))
  }
  const upstream = request({
    hostname: '127.0.0.1', port: 4174, path: req.url, method: req.method,
    headers: { ...req.headers, 'x-forwarded-proto': 'https' },
  }, (response) => {
    res.writeHead(response.statusCode, response.headers)
    response.pipe(res)
  })
  upstream.on('error', () => { res.statusCode = 502; res.end() })
  req.pipe(upstream)
}).listen(4181, '127.0.0.1'))

servers.push(createSecureServer(tls, (_req, res) => {
  res.setHeader('content-type', 'text/html')
  res.end('<!doctype html><html><body><iframe title="Mini App" src="https://127.0.0.1:4181/programs" style="width:390px;height:844px"></iframe></body></html>')
}).listen(4182, 'localhost'))

function stop() {
  for (const server of servers) server.close()
  rmSync(directory, { recursive: true, force: true })
  process.exit(0)
}
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
