import { describe, expect, it, vi } from 'vitest'
import { createSaveQueue } from './save-queue'

describe('workout autosave queue', () => {
  it('saves every edit in order, even when navigation edits another exercise before the response', async () => {
    const saved: string[] = []
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    const queue = createSaveQueue(async (value: string) => {
      if (value === 'exercise-1:10') await gate
      saved.push(value)
    }, vi.fn())
    queue.enqueue('exercise-1:10')
    queue.enqueue('exercise-1:12')
    queue.enqueue('exercise-2:15')
    await Promise.resolve()
    expect(saved).toEqual([])
    release()
    await queue.idle()
    expect(saved).toEqual(['exercise-1:10', 'exercise-1:12', 'exercise-2:15'])
  })

  it('stops all queued writes after an uncertain outcome and only resumes explicitly', async () => {
    const saved: number[] = []
    const failure = new Error('network')
    const onError = vi.fn()
    const queue = createSaveQueue(async (value: number) => {
      if (value === 1) throw failure
      saved.push(value)
    }, onError)
    queue.enqueue(1)
    queue.enqueue(2)
    await queue.idle()
    queue.enqueue(3)
    await queue.idle()
    expect(saved).toEqual([])
    expect(onError).toHaveBeenCalledWith(failure)
    queue.resume()
    queue.enqueue(4)
    await queue.idle()
    expect(saved).toEqual([4])
  })
})
