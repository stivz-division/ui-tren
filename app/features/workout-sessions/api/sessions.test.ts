import { describe, expect, it, vi } from 'vitest'
import { changeWorkoutExercise, fetchActiveWorkoutSession, finishWorkoutSession, saveExerciseSets, startWorkoutSession } from './sessions'

describe('startWorkoutSession', () => {
  it('sends the exact training program payload and returns the authoritative session', async () => {
    const session = { id: 9, training_program_id: 42, program_name: 'Грудь', scheduled_weekday: 1, status: 'in_progress', started_at: '2026-09-13T10:00:00+03:00', completed_at: null, cancelled_at: null, exercises: [] }
    const request = vi.fn().mockResolvedValue({ data: session })

    await expect(startWorkoutSession(request, 42)).resolves.toEqual(session)
    expect(request).toHaveBeenCalledWith('/workout-sessions/active', {
      method: 'PUT',
      body: { training_program_id: 42 },
    })
  })
})

describe('workout API contract', () => {
  it('accepts an empty active-session envelope', async () => {
    await expect(fetchActiveWorkoutSession(vi.fn().mockResolvedValue({ data: null }))).resolves.toBeNull()
  })

  it('saves an empty set list without substituting planned sets', async () => {
    const authoritative = { id: 9, exercises: [{ exercise_id: 10, sets: [] }] }
    const request = vi.fn().mockResolvedValue({ data: authoritative })
    await expect(saveExerciseSets(request, 9, 10, [])).resolves.toEqual(authoritative)
    expect(request).toHaveBeenCalledWith('/workout-sessions/9/exercises/10/sets', { method: 'PUT', body: { sets: [] } })
  })

  it('includes actual sets when completing an exercise', async () => {
    const sets = [{ repetitions: 12, working_weight_kg: 42.5 }]
    const authoritative = { id: 9, exercises: [{ exercise_id: 10, status: 'completed' }] }
    const request = vi.fn().mockResolvedValue({ data: authoritative })
    await expect(changeWorkoutExercise(request, 9, 10, 'complete', sets)).resolves.toEqual(authoritative)
    expect(request).toHaveBeenCalledWith('/workout-sessions/9/exercises/10/complete', { method: 'POST', body: { sets } })
  })

  it.each(['skip', 'reopen'] as const)('%s uses POST without a stale set payload', async (action) => {
    const request = vi.fn().mockResolvedValue({ data: { id: 9 } })
    await changeWorkoutExercise(request, 9, 10, action)
    expect(request).toHaveBeenCalledWith(`/workout-sessions/9/exercises/10/${action}`, { method: 'POST' })
  })

  it.each(['complete', 'cancel'] as const)('%s returns the authoritative terminal session', async (action) => {
    const result = { id: 9, status: action === 'complete' ? 'completed' : 'cancelled' }
    const request = vi.fn().mockResolvedValue({ data: result })
    await expect(finishWorkoutSession(request, 9, action)).resolves.toEqual(result)
    expect(request).toHaveBeenCalledWith(`/workout-sessions/9/${action}`, { method: 'POST' })
  })
})
