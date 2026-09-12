import { describe, expect, it } from 'vitest'
import { safeUpstreamData } from './request'

describe('safeUpstreamData', () => {
  it('keeps only actionable validation fields for client errors', () => {
    expect(safeUpstreamData({
      code: 'exercise_not_found',
      message: 'Internal model details',
      errors: { 'exercises.0.exercise_id': ['Unknown exercise'] },
    }, 422)).toEqual({
      code: 'exercise_not_found',
      errors: { 'exercises.0.exercise_id': ['Unknown exercise'] },
    })
  })

  it('does not expose upstream details for server failures', () => {
    expect(safeUpstreamData({
      code: 'internal_error',
      message: 'SQLSTATE connection secret',
      errors: { trace: ['sensitive stack'] },
    }, 500)).toBeUndefined()
  })
})
