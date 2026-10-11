<script setup lang="ts">
import type { ReplaceWorkoutExerciseInput, WorkoutExercise } from '#shared/types/api-tren'
import { useExerciseCatalog } from '~/features/exercises'
import type { ApiError } from '~/utils/api-error'
import { createSetRows, parseSetRows } from '~/utils/set-draft'

const props = defineProps<{ exercise: WorkoutExercise, exercises: WorkoutExercise[], busy: boolean, error: ApiError | null, returnFocusTo: HTMLElement | null }>()
const emit = defineEmits<{ close: [], confirm: [input: ReplaceWorkoutExerciseInput] }>()
const catalog = useExerciseCatalog()
const modalContent = { 'aria-label': 'Заменить упражнение', onCloseAutoFocus: restoreFocus }
const { status, error: catalogError } = catalog
const replacementId = shallowRef<number>()
const replaceInPlan = shallowRef(false)
const rows = ref(createSetRows(props.exercise.sets))
const parsed = computed(() => parseSetRows(rows.value, 1))
const errors = computed(() => ({ ...props.error?.fieldErrors, ...parsed.value.errors }))
const options = computed(() => {
  const used = new Set(props.exercises.map(exercise => (exercise.effective_exercise ?? exercise).exercise_id))
  return catalog.exercises.value.filter(exercise => !used.has(exercise.id)).map(({ id, name }) => ({ id, name }))
})
const canSubmit = computed(() => status.value === 'success' && options.value.some(exercise => exercise.id === replacementId.value) && !Object.keys(parsed.value.errors).length)
let lastInput: ReplaceWorkoutExerciseInput | undefined
let lastSignature = ''

function restoreFocus(event: Event) {
  event.preventDefault()
  void nextTick(() => {
    if (props.returnFocusTo?.isConnected) props.returnFocusTo.focus({ preventScroll: true })
  })
}

function confirm() {
  if (props.busy || !canSubmit.value || !replacementId.value) return
  const values = { replacement_exercise_id: replacementId.value, replace_in_plan: replaceInPlan.value, sets: parsed.value.sets }
  const signature = JSON.stringify(values)
  // An explicit retry of the same operation must keep its idempotency key.
  if (!lastInput || signature !== lastSignature) {
    lastInput = { request_id: globalThis.crypto.randomUUID(), ...values }
    lastSignature = signature
  }
  emit('confirm', lastInput)
}
onMounted(() => catalog.load())
</script>

<template>
  <UModal
    :open="true"
    :content="modalContent"
    title="Заменить упражнение"
    :description="`Вместо «${(exercise.effective_exercise ?? exercise).name}». Укажите новое упражнение и его подходы.`"
    :dismissible="!busy"
    :close="!busy"
    :ui="{ content: 'max-w-lg', body: 'space-y-5', footer: 'flex-col' }"
    @update:open="!$event && !busy && emit('close')"
  >
    <template #body>
      <USkeleton v-if="status === 'pending' || status === 'idle'" class="h-12 rounded-xl" aria-label="Загрузка упражнений" />
      <UAlert v-else-if="status !== 'success'" color="error" title="Не удалось загрузить упражнения" :description="catalogError?.message">
        <template #actions><UButton label="Повторить загрузку" @click="catalog.load(true)" /></template>
      </UAlert>
      <template v-else>
        <UFormField label="Новое упражнение" :error="error?.fieldErrors?.replacement_exercise_id">
          <USelectMenu
            v-model="replacementId"
            aria-label="Новое упражнение"
            :items="options"
            value-key="id"
            label-key="name"
            placeholder="Выберите упражнение"
            :search-input="{ placeholder: 'Поиск упражнения…' }"
            :disabled="busy"
            size="xl"
            class="w-full min-h-12"
            :ui="{ value: 'whitespace-normal text-left break-words', item: 'min-h-12', itemLabel: 'whitespace-normal break-words' }"
          >
            <template #empty>Нет доступных упражнений для замены</template>
          </USelectMenu>
        </UFormField>
        <SetEditor v-model="rows" :minimum="1" :disabled="busy" :errors="errors" />
        <UCheckbox v-model="replaceInPlan" label="Заменить и в программе" :disabled="busy" />
        <p class="text-sm text-muted">{{ replaceInPlan ? 'Упражнение и подходы изменятся в программе для следующих тренировок. Новая нагрузка будет учитываться в анализе текущей тренировки.' : 'Замена действует только в этой тренировке. Это упражнение не будет учитываться в её анализе. Программа останется прежней.' }}</p>
      </template>
      <UAlert v-if="error" color="error" :title="error.message">
        <template v-if="error.code === 'workout_replacement_candidate_not_found'" #actions>
          <UButton label="Обновить каталог" :disabled="busy" @click="catalog.load(true)" />
        </template>
      </UAlert>
    </template>
    <template #footer>
      <UButton label="Подтвердить замену" block size="xl" :loading="busy" :disabled="busy || !canSubmit" @click="confirm" />
      <UButton label="Отмена" color="neutral" variant="outline" block size="xl" :disabled="busy" @click="emit('close')" />
    </template>
  </UModal>
</template>
