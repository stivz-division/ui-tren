import { describe, expect, it } from 'vitest'
import { normalizeApiError } from './errors'

describe('normalizeApiError', () => {
  it('preserves Laravel field errors for accessible form rendering', () => {
    const error = normalizeApiError({
      statusCode: 422,
      data: {
        message: 'The given data was invalid.',
        errors: {
          'exercises.0.sets.1.repetitions': ['Поле обязательно.'],
        },
      },
    })

    expect(error).toMatchObject({
      kind: 'validation',
      status: 422,
      fieldErrors: {
        'exercises.0.sets.1.repetitions': 'Поле обязательно.',
      },
    })
  })

  it.each([
    [401, undefined, 'Требуется повторная авторизация'],
    [404, 'training_program_not_found', 'Программа не найдена'],
    [409, 'training_program_already_exists', 'На выбранный день программа уже создана'],
    [409, 'training_program_mutation_in_progress', 'Изменение расписания уже выполняется. Повторите попытку.'],
    [429, undefined, 'Слишком много запросов. Попробуйте немного позже.'],
  ])('maps status %s and code %s to a safe message', (statusCode, code, message) => {
    expect(normalizeApiError({ statusCode, data: { code } }).message).toBe(message)
  })

  it('does not expose an unknown technical response', () => {
    expect(normalizeApiError({ statusCode: 500, data: { message: 'SQLSTATE secret' } })).toMatchObject({
      kind: 'server',
      message: 'Сервис временно недоступен. Повторите попытку.',
    })
  })
})
