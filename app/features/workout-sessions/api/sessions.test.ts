import { describe, expect, it, vi } from 'vitest'
import { startWorkoutSession } from './sessions'

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
