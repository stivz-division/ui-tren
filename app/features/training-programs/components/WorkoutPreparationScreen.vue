<script setup lang="ts">
import { useAuth } from '~/features/auth/composables/useAuth'
import type { PlannedSetInput } from '#shared/types/api-tren'
import type { ApiError } from '../model/errors'
import { useTrainingPrograms } from '../composables/useTrainingPrograms'
import { useExerciseCatalog } from '../composables/useExerciseCatalog'
import { getExerciseFallbackName } from '../model/program'
import { useActiveWorkoutSession } from '~/features/workout-sessions'
import GroupedSetSummary from './GroupedSetSummary.vue'
import ProgramSetsModal from './ProgramSetsModal.vue'

const props = defineProps<{ programId: number }>()
const programs = useTrainingPrograms()
const catalog = useExerciseCatalog()
const active = useActiveWorkoutSession()
const program = computed(() => programs.findById(props.programId))
const editingId = shallowRef<number | null>(null)
const editing = computed(() => program.value?.exercises.find(exercise => exercise.exercise_id === editingId.value))
const error = ref<ApiError | null>(null)
const modalError = ref<ApiError | null>(null)
const exerciseName = (id: number) => catalog.exercises.value.find(item => item.id === id)?.name ?? getExerciseFallbackName(id)
const modalErrors = computed(() => {
  const index = program.value?.exercises.findIndex(exercise => exercise.exercise_id === editingId.value)
  const prefix = `exercises.${index}.`
  return Object.fromEntries(Object.entries(modalError.value?.fieldErrors ?? {}).map(([key, value]) => [key.startsWith(prefix) ? key.slice(prefix.length) : key, value]))
})

const { status: authStatus } = useAuth()
let initialized = false
watch(authStatus, (status) => {
  if (status !== 'authenticated' || initialized) return
  initialized = true
  void Promise.all([programs.load(true), catalog.load(), active.load()])
}, { immediate: true })
function edit(id: number) { modalError.value = null; editingId.value = id }
async function save(sets: PlannedSetInput[]) {
  if (!program.value || programs.mutationPending.value) return
  modalError.value = null
  try {
    await programs.update(program.value.id, {
      name: program.value.name,
      exercises: program.value.exercises.map(exercise => ({
        exercise_id: exercise.exercise_id,
        sets: exercise.exercise_id === editingId.value ? sets : exercise.sets.map(({ repetitions, working_weight_kg }) => ({ repetitions, working_weight_kg })),
      })),
    })
    editingId.value = null
  }
  catch (cause) {
    modalError.value = cause as ApiError
    if (modalError.value.status === 409 || modalError.value.status === 404 || modalError.value.status === 0 || modalError.value.status >= 500) await programs.load(true, true)
  }
}
async function start() {
  if (!program.value || active.pending.value) return
  error.value = null
  try {
    await active.start(program.value.id)
    await navigateTo('/workout-session', { replace: true })
  }
  catch (cause) {
    error.value = cause as ApiError
    if (error.value.status === 404) {
      await programs.load(true, true)
      await navigateTo('/programs', { replace: true })
    }
    else if (error.value.status === 409 || error.value.status === 0 || error.value.status >= 500) {
      await Promise.all([programs.load(true, true), active.load()])
    }
  }
}
</script>

<template>
  <div>
    <ScreenHeader title="Перед тренировкой" subtitle="Проверьте упражнения и подходы" back />
    <USkeleton v-if="programs.status.value === 'pending' || programs.status.value === 'idle'" class="h-72 rounded-2xl" />
    <UAlert v-else-if="programs.error.value" color="error" title="Не удалось загрузить программу" :description="programs.error.value.message">
      <template #actions><UButton label="Повторить" @click="programs.load(true)" /></template>
    </UAlert>
    <UAlert v-else-if="!program" title="Программа не найдена" color="warning"><template #actions><UButton to="/programs" label="К программам" /></template></UAlert>
    <template v-else>
      <h2 class="mb-5 break-words text-xl font-bold text-highlighted">{{ program.name }}</h2>
      <UAlert v-if="catalog.error.value" class="mb-4" color="warning" title="Не удалось загрузить названия упражнений">
        <template #actions><UButton label="Загрузить названия" @click="catalog.load(true)" /></template>
      </UAlert>
      <ol class="divide-y divide-default rounded-[18px] border border-default px-4">
        <li v-for="(exercise, index) in program.exercises" :key="exercise.exercise_id" class="flex items-center gap-3 py-4">
          <span class="text-sm text-muted">{{ index + 1 }}</span>
          <div class="min-w-0 flex-1"><h3 class="mb-1 break-words font-semibold text-highlighted">{{ exerciseName(exercise.exercise_id) }}</h3><GroupedSetSummary :sets="exercise.sets" /></div>
          <UButton :aria-label="`Изменить подходы: ${exerciseName(exercise.exercise_id)}`" icon="i-lucide-pencil" variant="soft" color="neutral" class="min-h-11 min-w-11 shrink-0 justify-center" :disabled="active.pending.value" @click="edit(exercise.exercise_id)" />
        </li>
      </ol>
      <UAlert v-if="error" class="mt-5" color="error" :title="error.message" />
      <UAlert v-if="active.session.value" class="mt-6" color="primary" title="У вас уже есть активная тренировка" :description="active.session.value.program_name">
        <template #actions><UButton to="/workout-session" label="Продолжить тренировку" size="lg" /></template>
      </UAlert>
      <UButton v-else label="Подтвердить и начать" block size="xl" class="mt-8 min-h-12" :loading="active.pending.value" :disabled="programs.mutationPending.value || active.loading.value || active.pending.value" @click="start" />
      <ProgramSetsModal v-if="editing" :key="editing.exercise_id" :name="exerciseName(editing.exercise_id)" :sets="editing.sets" :pending="programs.mutationPending.value" :error="modalError?.message" :server-errors="modalErrors" @close="editingId = null" @save="save" />
    </template>
  </div>
</template>
