type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
}

function canLog(level: LogLevel): boolean {
  const configured = (import.meta.dev ? 'debug' : 'warn') satisfies LogLevel
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[configured]
}

export const logger = {
  debug(event: string, context: Record<string, unknown> = {}) {
    if (canLog('debug')) console.debug(event, context)
  },
  info(event: string, context: Record<string, unknown> = {}) {
    if (canLog('info')) console.info(event, context)
  },
  warn(event: string, context: Record<string, unknown> = {}) {
    if (canLog('warn')) console.warn(event, context)
  },
  error(event: string, context: Record<string, unknown> = {}) {
    if (canLog('error')) console.error(event, context)
  },
}
