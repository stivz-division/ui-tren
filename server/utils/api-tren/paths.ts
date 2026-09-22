interface AuthEnvironment {
  appEnv: string
  telegramInitData: string
}

const RULES: Array<{ methods: string[], pattern: RegExp }> = [
  { methods: ['GET', 'POST'], pattern: /^training-programs$/ },
  { methods: ['PUT', 'DELETE'], pattern: /^training-programs\/\d+$/ },
  { methods: ['GET'], pattern: /^training-programs\/weekdays\/[1-7]$/ },
  { methods: ['GET'], pattern: /^exercises$/ },
  { methods: ['GET', 'PUT'], pattern: /^workout-sessions\/active$/ },
  { methods: ['GET'], pattern: /^workout-sessions$/ },
  { methods: ['GET'], pattern: /^workout-sessions\/[1-9]\d*\/analysis$/ },
  { methods: ['POST'], pattern: /^workout-recommendations\/[1-9]\d*\/(apply|reject)$/ },
  { methods: ['PUT'], pattern: /^workout-sessions\/[1-9]\d*\/exercises\/[1-9]\d*\/sets$/ },
  { methods: ['POST'], pattern: /^workout-sessions\/[1-9]\d*\/exercises\/[1-9]\d*\/(complete|skip|reopen)$/ },
  { methods: ['POST'], pattern: /^workout-sessions\/[1-9]\d*\/(complete|cancel)$/ },
]

export function isAllowedApiRequest(method: string, path: string): boolean {
  return RULES.some(rule => rule.methods.includes(method.toUpperCase()) && rule.pattern.test(path))
}

export function resolveAuthInitData(clientInitData: string, environment: AuthEnvironment): string {
  if (environment.appEnv === 'local' && environment.telegramInitData.trim()) {
    return environment.telegramInitData
  }
  return clientInitData
}
