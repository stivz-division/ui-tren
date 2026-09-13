<script setup lang="ts">
import { useAuth } from '~/features/auth/composables/useAuth'
import type { DraftErrors } from '~/features/training-programs/model/form'
import ProgramForm from '~/features/training-programs/components/ProgramForm.vue'
import { useExerciseCatalog } from '~/features/training-programs/composables/useExerciseCatalog'
import { useProgramDraft } from '~/features/training-programs/composables/useProgramDraft'
import { useTrainingPrograms } from '~/features/training-programs/composables/useTrainingPrograms'
import { useUnsavedProgramChanges } from '~/features/training-programs/composables/useUnsavedProgramChanges'
import type { ApiError } from '~/features/training-programs/model/errors'
import { toCreateProgramInput } from '~/features/training-programs/model/form'

const programsState = useTrainingPrograms()
const catalog = useExerciseCatalog()
const draftState = useProgramDraft('create')
const { draft, isDirty } = draftState
const errors = shallowRef<DraftErrors>({})
const toast = useToast()
const { status: authStatus } = useAuth()

watch(authStatus, (value) => {
  if (value === 'authenticated') void Promise.all([programsState.load(), catalog.load()])
}, { immediate: true })
useUnsavedProgramChanges(isDirty, () => draftState.reset())

async function submit() {
  const result = toCreateProgramInput(draft.value)
  if (!result.ok) {
    errors.value = result.errors
    return
  }

  try {
    const program = await programsState.create(result.value)
    draftState.reset()
    toast.add({ title: 'Тренировка создана', color: 'success' })
    await navigateTo(`/programs/${program.id}`, { replace: true })
  }
  catch (cause) {
    const error = cause as ApiError
    errors.value = error.fieldErrors ?? {}
    if (error.code === 'training_program_already_exists') {
      errors.value = { ...errors.value, weekday: error.message }
      await programsState.load(true, true)
    }
    if (error.code === 'training_program_mutation_in_progress') await programsState.load(true, true)
    if (['exercise_not_found', 'exercise_already_planned', 'training_program_must_contain_exercise'].includes(error.code ?? '')) {
      errors.value = { ...errors.value, exercises: error.message }
      if (error.code === 'exercise_not_found') await catalog.load(true)
    }
    toast.add({ title: error.message, color: 'error' })
  }
}
</script>

<template>
  <div>
    <ScreenHeader title="Новая тренировка" back />
    <ProgramForm
      v-model="draft"
      mode="create"
      :occupied-weekdays="programsState.programs.value.map(item => item.weekday)"
      :catalog="catalog.exercises.value"
      :catalog-unavailable="catalog.status.value === 'unavailable'"
      :catalog-error="catalog.status.value === 'error' ? catalog.error.value?.message : undefined"
      :errors="errors"
      :pending="programsState.mutationPending.value"
      @submit="submit"
      @retry-catalog="catalog.load(true)"
    />
  </div>
</template>
