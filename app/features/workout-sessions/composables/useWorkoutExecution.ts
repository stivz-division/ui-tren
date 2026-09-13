import { useAuth } from '~/features/auth/composables/useAuth'
import type { PlannedSetInput, WorkoutSession } from '#shared/types/api-tren'
import type { ApiError } from '~/utils/api-error'
import { createSetRows, parseSetRows, type SetRow } from '~/utils/set-draft'
import { useApiClient } from '~/utils/api-client'
import { changeWorkoutExercise, finishWorkoutSession, saveExerciseSets, type ExerciseAction, type SessionAction } from '../api/sessions'
import { createSaveQueue } from '../model/save-queue'
import { useActiveWorkoutSession } from './useActiveWorkoutSession'

interface ExerciseDraft {
  rows: SetRow[]
  version: number
  dirty: boolean
  serverErrors: Record<string, string>
}
interface SaveJob { sessionId: number, exerciseId: number, version: number, sets: PlannedSetInput[] }

export function useWorkoutExecution() {
  const active = useActiveWorkoutSession()
  const { request } = useApiClient()
  const drafts = reactive<Record<number, ExerciseDraft>>({})
  const error = ref<ApiError | null>(null)
  const queued = shallowRef(0)
  const acting = shallowRef(false)
  const result = ref<WorkoutSession | null>(null)
  const dirty = computed(() => Object.values(drafts).some(draft => draft.dirty))
  const busy = computed(() => queued.value > 0 || acting.value || active.pending.value || active.loading.value)
  const canFinish = computed(() => !!active.session.value?.exercises.length && active.session.value.exercises.every(exercise => exercise.status !== 'pending') && !dirty.value && !busy.value && !error.value)
  let sessionId: number | undefined

  function syncDrafts() {
    const session = active.session.value
    if (!session) return
    if (sessionId !== session.id) {
      for (const key of Object.keys(drafts)) Reflect.deleteProperty(drafts, key)
      sessionId = session.id
    }
    for (const exercise of session.exercises) {
      const draft = drafts[exercise.exercise_id]
      if (draft?.dirty) continue
      const rows = createSetRows(exercise.sets).map((row, index) => ({ ...row, key: draft?.rows[index]?.key ?? row.key }))
      drafts[exercise.exercise_id] = { rows, dirty: false, version: draft?.version ?? 0, serverErrors: {} }
    }
  }
  watch(active.session, syncDrafts, { immediate: true })

  const queue = createSaveQueue<SaveJob>(async (job) => {
    if (active.session.value?.id !== job.sessionId) throw { status: 409, message: 'Активная тренировка изменилась. Обновите данные.' }
    try {
      await active.mutate(() => saveExerciseSets(request, job.sessionId, job.exerciseId, job.sets))
      const draft = drafts[job.exerciseId]
      if (draft?.version === job.version) draft.dirty = false
      syncDrafts()
      queued.value--
    }
    catch (cause) {
      const draft = drafts[job.exerciseId]
      if (draft) draft.serverErrors = (cause as ApiError).fieldErrors ?? {}
      throw cause
    }
  }, (cause) => { queued.value = 0; error.value = cause as ApiError })

  function enqueue(exerciseId: number) {
    const draft = drafts[exerciseId]
    const session = active.session.value
    if (!draft || !session || error.value) return
    const parsed = parseSetRows(draft.rows)
    if (Object.keys(parsed.errors).length) return
    queued.value++
    queue.enqueue({ sessionId: session.id, exerciseId, version: draft.version, sets: parsed.sets })
  }
  function edit(exerciseId: number, rows: SetRow[]) {
    const draft = drafts[exerciseId]
    if (!draft || acting.value) return
    draft.rows = rows
    draft.version++
    draft.dirty = true
    draft.serverErrors = {}
    enqueue(exerciseId)
  }
  function errorsFor(exerciseId: number) {
    const draft = drafts[exerciseId]
    return draft ? { ...draft.serverErrors, ...parseSetRows(draft.rows).errors } : {}
  }

  async function recover() {
    if (busy.value) return
    const previousId = active.session.value?.id
    if (!await active.load()) return
    if (active.session.value?.id !== previousId) {
      queue.resume()
      error.value = null
      for (const key of Object.keys(drafts)) Reflect.deleteProperty(drafts, key)
      syncDrafts()
      return
    }
    error.value = null
    queue.resume()
    for (const exercise of active.session.value?.exercises ?? []) {
      if (!drafts[exercise.exercise_id]?.dirty) continue
      if (exercise.status !== 'pending') {
        error.value = { kind: 'conflict', status: 409, message: 'Упражнение уже закрыто. Загрузите сохранённое состояние, затем откройте его снова.' }
        return
      }
    }
    for (const exercise of active.session.value?.exercises ?? []) {
      if (drafts[exercise.exercise_id]?.dirty) enqueue(exercise.exercise_id)
    }
  }
  async function reload() {
    if (busy.value) return
    if (dirty.value && !window.confirm('Загрузить сохранённые данные? Несохранённые изменения будут потеряны.')) return
    if (!await active.load()) return
    for (const key of Object.keys(drafts)) Reflect.deleteProperty(drafts, key)
    error.value = null
    queue.resume()
    syncDrafts()
  }

  async function exerciseAction(exerciseId: number, action: ExerciseAction): Promise<boolean> {
    if (acting.value || error.value) return false
    acting.value = true
    try {
      await queue.idle()
      if (error.value || !active.session.value) return false
      const draft = drafts[exerciseId]
      if (!draft) return false
      const parsed = parseSetRows(draft.rows, action === 'complete' ? 1 : 0)
      if (action === 'complete' && (draft.dirty || Object.keys(parsed.errors).length)) {
        draft.serverErrors = parsed.errors
        return false
      }
      await active.mutate(() => changeWorkoutExercise(request, active.session.value!.id, exerciseId, action, parsed.sets))
      draft.dirty = false
      syncDrafts()
      return true
    }
    catch (cause) { error.value = cause as ApiError; await active.load(); return false }
    finally { acting.value = false }
  }
  async function finish(action: SessionAction): Promise<boolean> {
    if (acting.value || (action === 'complete' && !canFinish.value)) return false
    acting.value = true
    try {
      await queue.idle()
      if (!active.session.value) return false
      result.value = await active.mutate(() => finishWorkoutSession(request, active.session.value!.id, action))
      for (const key of Object.keys(drafts)) Reflect.deleteProperty(drafts, key)
      error.value = null
      return true
    }
    catch (cause) { error.value = cause as ApiError; await active.load(); return false }
    finally { acting.value = false }
  }

  async function resume() {
    if (document.visibilityState === 'visible' && !busy.value && !dirty.value) await active.load()
  }
  function beforeUnload(event: BeforeUnloadEvent) {
    if (dirty.value || busy.value) { event.preventDefault(); event.returnValue = '' }
  }
  onBeforeRouteLeave(async () => {
    await queue.idle()
    if (acting.value) return false
    return !dirty.value || window.confirm('Выйти из тренировки? Несохранённые изменения будут потеряны.')
  })
  const { status: authStatus } = useAuth()
  watch(authStatus, (status) => { if (status === 'authenticated' && !dirty.value && !busy.value) void active.load() }, { immediate: true })
  onMounted(() => {
    document.addEventListener('visibilitychange', resume)
    window.addEventListener('beforeunload', beforeUnload)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', resume)
    window.removeEventListener('beforeunload', beforeUnload)
  })
  return { active, drafts, error, busy, acting, dirty, queued, canFinish, result, edit, errorsFor, recover, reload, exerciseAction, finish }
}
