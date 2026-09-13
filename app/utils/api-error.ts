export type ApiErrorKind =
  | 'authentication'
  | 'not-found'
  | 'conflict'
  | 'validation'
  | 'rate-limit'
  | 'network'
  | 'server'

export interface ApiError {
  kind: ApiErrorKind
  status: number
  code?: string
  message: string
  fieldErrors?: Record<string, string>
  retryAfter?: number
}

interface ErrorLike {
  status?: number
  statusCode?: number
  data?: unknown
  response?: {
    status?: number
    headers?: Headers
    _data?: unknown
  }
}

interface ErrorData {
  code?: string
  errors?: Record<string, string[]>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseErrorData(value: unknown): ErrorData {
  if (!isRecord(value)) return {}
  const source = !('code' in value) && !('errors' in value) && isRecord(value.data)
    ? value.data
    : value

  const errors = isRecord(source.errors)
    ? Object.fromEntries(
        Object.entries(source.errors).filter((entry): entry is [string, string[]] => (
          Array.isArray(entry[1]) && entry[1].every(item => typeof item === 'string')
        )),
      )
    : undefined

  return {
    code: typeof source.code === 'string' ? source.code : undefined,
    errors,
  }
}

function domainMessage(status: number, code?: string): string | null {
  const workoutMessages: Record<string, string> = {
    workout_session_not_found: 'Тренировка больше не найдена. Обновите данные.',
    workout_exercise_not_found: 'Упражнение больше не найдено. Обновите тренировку.',
    workout_session_not_in_progress: 'Эта тренировка уже завершена или отменена.',
    workout_exercise_not_editable: 'Упражнение закрыто. Откройте его снова, чтобы изменить подходы.',
    workout_session_has_pending_exercises: 'Завершите или пропустите оставшиеся упражнения.',
    workout_exercise_has_no_sets: 'Добавьте хотя бы один подход для завершения упражнения.',
  }
  if (code && workoutMessages[code]) return workoutMessages[code]!

  if (status === 404 && code === 'training_program_not_found') return 'Программа не найдена'
  if (status === 409 && code === 'training_program_already_exists') {
    return 'На выбранный день программа уже создана'
  }
  if (status === 409 && code === 'training_program_mutation_in_progress') {
    return 'Изменение расписания уже выполняется. Повторите попытку.'
  }
  if (status === 422 && code === 'exercise_not_found') {
    return 'Одно из упражнений больше недоступно. Обновите выбор.'
  }
  if (status === 422 && code === 'exercise_already_planned') {
    return 'Одно упражнение выбрано несколько раз.'
  }
  if (status === 422 && code === 'training_program_must_contain_exercise') {
    return 'Добавьте хотя бы одно упражнение.'
  }
  if (status === 409 && code === 'active_workout_session_already_exists') {
    return 'У вас уже есть активная тренировка.'
  }
  if (status === 409 && code === 'workout_session_mutation_in_progress') {
    return 'Изменение тренировки уже выполняется. Повторите попытку.'
  }
  if (status === 409 && code === 'invalid_training_program_snapshot') {
    return 'Программа изменилась. Обновите её перед запуском тренировки.'
  }
  return null
}

export function normalizeApiError(error: unknown): ApiError {
  if (!isRecord(error)) {
    return { kind: 'network', status: 0, message: 'Не удалось связаться с сервисом. Проверьте соединение.' }
  }

  const errorLike = error as ErrorLike
  const status = errorLike.statusCode ?? errorLike.status ?? errorLike.response?.status ?? 0
  const data = parseErrorData(errorLike.data ?? errorLike.response?._data)
  const retryAfterHeader = errorLike.response?.headers?.get('retry-after')
  const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : undefined
  const message = domainMessage(status, data.code)

  if (status === 401) return { kind: 'authentication', status, code: data.code, message: 'Требуется повторная авторизация' }
  if (status === 404) return { kind: 'not-found', status, code: data.code, message: message ?? 'Данные не найдены' }
  if (status === 409) return { kind: 'conflict', status, code: data.code, message: message ?? 'Состояние изменилось. Обновите данные.' }
  if (status === 422) {
    return {
      kind: 'validation',
      status,
      code: data.code,
      message: message ?? 'Проверьте заполненные поля',
      fieldErrors: Object.fromEntries(
        Object.entries(data.errors ?? {}).map(([path, messages]) => [path, messages[0] ?? 'Некорректное значение']),
      ),
    }
  }
  if (status === 429) {
    return {
      kind: 'rate-limit',
      status,
      code: data.code,
      message: 'Слишком много запросов. Попробуйте немного позже.',
      retryAfter: Number.isFinite(retryAfter) ? retryAfter : undefined,
    }
  }
  if (status >= 500) return { kind: 'server', status, code: data.code, message: 'Сервис временно недоступен. Повторите попытку.' }

  return { kind: 'network', status, code: data.code, message: 'Не удалось выполнить запрос. Повторите попытку.' }
}
