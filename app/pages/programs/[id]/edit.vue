<script setup lang="ts">
import { useAuth } from '~/features/auth/composables/useAuth'
import type { DraftErrors } from '~/features/training-programs/model/form'
import ProgramForm from '~/features/training-programs/components/ProgramForm.vue'
import { useExerciseCatalog } from '~/features/training-programs/composables/useExerciseCatalog'
import { useProgramDraft } from '~/features/training-programs/composables/useProgramDraft'
import { useTrainingPrograms } from '~/features/training-programs/composables/useTrainingPrograms'
import { useUnsavedProgramChanges } from '~/features/training-programs/composables/useUnsavedProgramChanges'
import type { ApiError } from '~/features/training-programs/model/errors'
import { toUpdateProgramInput } from '~/features/training-programs/model/form'

const route = useRoute()
const programId = Number(route.params.id)
const programsState = useTrainingPrograms()
const catalog = useExerciseCatalog()
const program = computed(() => programsState.findById(programId))
const draftState = useProgramDraft(`edit:${programId}`, program.value ?? undefined)
const errors = shallowRef<DraftErrors>({})
const toast = useToast()
const { status: authStatus } = useAuth()
watch(authStatus, (value) => {
  if (value === 'authenticated') void Promise.all([programsState.load(), catalog.load()])
}, { immediate: true })

watch(program, (value) => {
  if (value && !draftState.isDirty.value) draftState.reset(value)
}, { immediate: true })
useUnsavedProgramChanges(draftState.isDirty, () => draftState.reset(program.value ?? undefined))

async function submit() {
  const result = toUpdateProgramInput(draftState.draft.value)
  if (!result.ok) {
    errors.value = result.errors
    return
  }

  try {
    const saved = await programsState.update(programId, result.value)
    draftState.reset(saved)
    toast.add({ title: 'Изменения сохранены', color: 'success' })
    await navigateTo(`/programs/${programId}`)
  }
  catch (cause) {
    const error = cause as ApiError
    errors.value = error.fieldErrors ?? {}
    if (error.status === 404) {
      await programsState.load(true, true)
      draftState.reset()
      toast.add({ title: 'Программа не найдена', color: 'warning' })
      await navigateTo('/programs', { replace: true })
      return
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
    <ScreenHeader title="Редактирование" back />
    <div v-if="programsState.status.value === 'idle' || programsState.status.value === 'pending'" class="space-y-5" aria-label="Загрузка программы">
      <USkeleton class="h-16 rounded-2xl" />
      <USkeleton class="h-72 rounded-[18px]" />
    </div>
    <UAlert
      v-else-if="programsState.status.value === 'error'"
      title="Не удалось загрузить программу"
      :description="programsState.error.value?.message"
      color="error"
      icon="i-lucide-circle-alert"
    >
      <template #actions>
        <UButton label="Повторить" color="error" variant="soft" size="lg" @click="programsState.load(true)" />
        <UButton to="/programs" label="К списку программ" color="neutral" variant="ghost" size="lg" />
      </template>
    </UAlert>
    <UAlert v-else-if="!program" title="Программа не найдена" color="warning">
      <template #actions>
        <UButton to="/programs" label="К списку программ" size="xl" />
      </template>
    </UAlert>
    <ProgramForm
      v-else
      v-model="draftState.draft.value"
      mode="edit"
      :occupied-weekdays="[]"
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
