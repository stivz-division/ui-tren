// @vitest-environment nuxt
import { afterEach, expect, it, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useExerciseDetails } from './useExerciseDetails'
import type { DataEnvelope, Exercise } from '#shared/types/api-tren'

const { request } = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('~/utils/api-client', () => ({ useApiClient: () => ({ request }) }))
enableAutoUnmount(afterEach)

it('ignores a late response after selecting another exercise or closing the modal', async () => {
  const pending: Array<(value: DataEnvelope<Exercise>) => void> = []
  request.mockImplementation(() => new Promise(resolve => pending.push(resolve)))
  const id = ref(10)
  const open = ref(false)
  let details!: ReturnType<typeof useExerciseDetails>
  await mountSuspended(defineComponent({
    setup() {
      details = useExerciseDetails(() => id.value, () => open.value)
      return () => null
    },
  }))
  expect(pending).toHaveLength(0)
  open.value = true
  await nextTick()
  id.value = 20
  await nextTick()
  const exercise = { id: 20, code: 'row', name: 'Тяга', description: null, video_url: null }
  pending[1]!({ data: exercise })
  await vi.waitFor(() => expect(details.exercise.value?.id).toBe(20))
  pending[0]!({ data: { ...exercise, id: 10, name: 'Жим' } })
  await nextTick()
  expect(details.exercise.value?.id).toBe(20)
  const reload = details.load()
  open.value = false
  await nextTick()
  pending[2]!({ data: exercise })
  await reload
  expect(details.exercise.value).toBeNull()
  expect(details.loading.value).toBe(false)
})
