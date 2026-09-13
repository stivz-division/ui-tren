import { describe, expect, it, vi } from 'vitest'
import { fetchExerciseCatalog } from './exercises'

describe('fetchExerciseCatalog', () => {
  it('loads the production exercise catalog from its data envelope', async () => {
    const request = vi.fn().mockResolvedValue({
      data: [
        { id: 10, name: 'Жим лёжа' },
        { id: 20, name: 'Тяга верхнего блока' },
      ],
    })

    await expect(fetchExerciseCatalog(request)).resolves.toEqual([
      { id: 10, name: 'Жим лёжа' },
      { id: 20, name: 'Тяга верхнего блока' },
    ])
    expect(request).toHaveBeenCalledWith('/exercises')
  })
})
