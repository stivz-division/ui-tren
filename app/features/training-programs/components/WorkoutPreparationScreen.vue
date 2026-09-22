<script setup lang="ts">
import { useAuth } from '~/features/auth/composables/useAuth'
import type { PlannedSetInput } from '#shared/types/api-tren'
import type { ApiError } from '../model/errors'
import { useTrainingPrograms } from '../composables/useTrainingPrograms'
import { useExerciseCatalog } from '../composables/useExerciseCatalog'
import { getExerciseFallbackName } from '../model/program'
import { WorkoutAnalysisPanel } from '~/features/workout-analysis'
import { useWorkoutPreparation } from '~/composables/useWorkoutPreparation'
import GroupedSetSummary from '~/components/ui/GroupedSetSummary.vue'
import ProgramSetsModal from './ProgramSetsModal.vue'

const props = defineProps<{ programId: number }>()
const programs = useTrainingPrograms()
const catalog = useExerciseCatalog()
const preparation = useWorkoutPreparation(() => props.programId)
const active = preparation.active
const program = computed(() => programs.findById(props.programId))
const editingId = shallowRef<number | null>(null)
const editing = computed(() => program.value?.exercises.find(exercise => exercise.exercise_id === editingId.value))
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
  void Promise.all([programs.load(true), catalog.load(), preparation.inspect()])
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
    if (preparation.sessionId.value) await preparation.cache.load(preparation.sessionId.value, true)
  }
  catch (cause) {
    modalError.value = cause as ApiError
    if (modalError.value.status === 409 || modalError.value.status === 404 || modalError.value.status === 0 || modalError.value.status >= 500) await programs.load(true, true)
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
          <UButton :aria-label="`Изменить подходы: ${exerciseName(exercise.exercise_id)}`" icon="i-lucide-pencil" variant="soft" color="neutral" class="min-h-11 min-w-11 shrink-0 justify-center" :disabled="preparation.blocked.value" @click="edit(exercise.exercise_id)" />
        </li>
      </ol>
      <p v-if="preparation.checking.value" class="mt-6 text-toned" role="status">Проверяем предыдущую тренировку и рекомендации…</p>
      <UAlert v-if="preparation.error.value" class="mt-5" color="warning" :title="preparation.error.value">
        <template #actions><UButton label="Повторить проверку" class="min-h-11" :disabled="preparation.checking.value || preparation.cache.busy.value" @click="preparation.inspect" /></template>
      </UAlert>
      <section v-if="preparation.sessionId.value && !active.session.value" class="mt-8 space-y-3">
        <h2 class="text-xl font-bold text-highlighted">Рекомендации перед тренировкой</h2>
        <WorkoutAnalysisPanel :key="preparation.sessionId.value" :session-id="preparation.sessionId.value" recommendations-only :disabled="programs.mutationPending.value || editingId !== null || preparation.starting.value" />
        <p v-if="preparation.incomplete.value" class="text-sm leading-relaxed text-toned">Можно дождаться результата или начать с текущим планом. Новые рекомендации не изменят уже начатую тренировку.</p>
      </section>
      <UAlert v-if="active.session.value" class="mt-6" color="primary" title="У вас уже есть активная тренировка" :description="active.session.value.program_name">
        <template #actions><UButton to="/workout-session" label="Продолжить тренировку" size="lg" /></template>
      </UAlert>
      <UButton v-else :label="preparation.incomplete.value ? 'Начать с текущим планом' : 'Подтвердить и начать'" block size="xl" class="mt-8 min-h-12" :ui="{ label: 'whitespace-normal' }" :loading="preparation.starting.value" :disabled="preparation.blocked.value || editingId !== null" @click="preparation.start()" />
      <UModal v-model:open="preparation.confirmationOpen.value" title="Начать с текущим планом?" description="Неприменённые рекомендации станут неактуальны после начала тренировки" :dismissible="!preparation.starting.value">
        <template #body>
          <div class="flex flex-col gap-3">
            <UButton label="Вернуться к предложениям" variant="soft" color="neutral" block class="min-h-11" :disabled="preparation.starting.value" @click="preparation.confirmationOpen.value = false" />
            <UButton label="Начать с текущим планом" block class="min-h-11" :loading="preparation.starting.value" :disabled="preparation.blocked.value" @click="preparation.start(true)" />
          </div>
        </template>
      </UModal>
      <ProgramSetsModal v-if="editing" :key="editing.exercise_id" :name="exerciseName(editing.exercise_id)" :sets="editing.sets" :pending="programs.mutationPending.value" :error="modalError?.message" :server-errors="modalErrors" @close="editingId = null" @save="save" />
    </template>
  </div>
</template>
