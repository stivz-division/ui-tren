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

  it('reads domain data wrapped by the Nuxt BFF error response', () => {
    expect(normalizeApiError({
      statusCode: 409,
      data: {
        statusCode: 409,
        statusMessage: 'API request failed',
        data: { code: 'training_program_already_exists' },
      },
    })).toMatchObject({
      kind: 'conflict',
      code: 'training_program_already_exists',
      message: 'На выбранный день программа уже создана',
    })
  })

  it.each([
    [401, undefined, 'Требуется повторная авторизация'],
    [404, 'training_program_not_found', 'Программа не найдена'],
    [409, 'training_program_already_exists', 'На выбранный день программа уже создана'],
    [409, 'training_program_mutation_in_progress', 'Изменение расписания уже выполняется. Повторите попытку.'],
    [422, 'exercise_not_found', 'Одно из упражнений больше недоступно. Обновите выбор.'],
    [422, 'exercise_already_planned', 'Одно упражнение выбрано несколько раз.'],
    [422, 'training_program_must_contain_exercise', 'Добавьте хотя бы одно упражнение.'],
    [409, 'active_workout_session_already_exists', 'У вас уже есть активная тренировка.'],
    [409, 'workout_session_mutation_in_progress', 'Изменение тренировки уже выполняется. Повторите попытку.'],
    [409, 'invalid_training_program_snapshot', 'Программа изменилась. Обновите её перед запуском тренировки.'],
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

  it('uses a domain validation message when Laravel has no field errors', () => {
    expect(normalizeApiError({ statusCode: 422, data: { code: 'exercise_not_found' } })).toMatchObject({
      kind: 'validation',
      message: 'Одно из упражнений больше недоступно. Обновите выбор.',
      fieldErrors: {},
    })
  })
})
