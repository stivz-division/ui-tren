<script setup lang="ts">
import type { SetDraft } from '../model/form'
const model = defineModel<SetDraft>({ required: true })
const props = defineProps<{ index: number, canDelete: boolean, errors?: Record<string, string>, path: string }>()
defineEmits<{ remove: [] }>()
const errorIdBase = computed(() => props.path.replaceAll('.', '-'))
</script>

<template>
  <div class="grid grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)_44px] items-start gap-2 tabular-nums">
    <div class="flex min-h-12 items-center justify-center rounded-xl bg-muted font-medium" :aria-label="`Подход ${index + 1}`">{{ index + 1 }}</div>
    <label><span class="mb-1 block text-sm text-muted">Повторы</span><input v-model="model.repetitions" inputmode="numeric" class="min-h-12 w-full rounded-xl border border-default bg-default px-3 text-base" :aria-invalid="Boolean(errors?.[`${path}.repetitions`])" :aria-describedby="errors?.[`${path}.repetitions`] ? `${errorIdBase}-repetitions-error` : undefined" ><span v-if="errors?.[`${path}.repetitions`]" :id="`${errorIdBase}-repetitions-error`" class="mt-1 block text-sm text-error" role="alert">{{ errors[`${path}.repetitions`] }}</span></label>
    <label><span class="mb-1 block text-sm text-muted">Вес, кг</span><input v-model="model.workingWeightKg" inputmode="decimal" class="min-h-12 w-full rounded-xl border border-default bg-default px-3 text-base" :aria-invalid="Boolean(errors?.[`${path}.working_weight_kg`])" :aria-describedby="errors?.[`${path}.working_weight_kg`] ? `${errorIdBase}-weight-error` : undefined" ><span v-if="errors?.[`${path}.working_weight_kg`]" :id="`${errorIdBase}-weight-error`" class="mt-1 block text-sm text-error" role="alert">{{ errors[`${path}.working_weight_kg`] }}</span></label>
    <UButton :aria-label="`Удалить подход ${index + 1}`" icon="i-lucide-minus-circle" color="error" variant="ghost" size="xl" class="mt-6 min-h-11 min-w-11" :disabled="!canDelete" :title="canDelete ? undefined : 'Последний подход удалить нельзя'" @click="$emit('remove')" />
  </div>
</template>
