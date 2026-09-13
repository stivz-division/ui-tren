<script setup lang="ts">
import type { SetRow } from '~/utils/set-draft'

const props = withDefaults(defineProps<{ modelValue: SetRow[], disabled?: boolean, minimum?: number, errors?: Record<string, string> }>(), { minimum: 0, errors: undefined })
const emit = defineEmits<{ 'update:modelValue': [rows: SetRow[]] }>()
const id = useId()

function edit(index: number, field: 'repetitions' | 'weight', event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', props.modelValue.map((row, i) => i === index ? { ...row, [field]: value } : row))
}

function add() {
  const last = props.modelValue.at(-1)
  emit('update:modelValue', [...props.modelValue, { key: globalThis.crypto.randomUUID(), repetitions: last?.repetitions ?? '10', weight: last?.weight ?? '0' }])
}
</script>

<template>
  <fieldset :disabled="disabled" class="min-w-0 space-y-3">
    <legend class="sr-only">Подходы</legend>
    <div v-for="(row, index) in modelValue" :key="row.key" class="grid grid-cols-[24px_minmax(0,1fr)_minmax(0,1fr)_44px] items-start gap-2">
      <span class="pt-8 text-sm text-muted">{{ index + 1 }}</span>
      <label class="min-w-0 text-sm text-muted">
        Повторы
        <input :value="row.repetitions" inputmode="numeric" class="mt-1 min-h-12 w-full rounded-xl border border-default bg-default px-3 text-base text-highlighted focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60" :aria-invalid="Boolean(errors?.[`sets.${index}.repetitions`])" :aria-describedby="errors?.[`sets.${index}.repetitions`] ? `${id}-${index}-reps` : undefined" @input="edit(index, 'repetitions', $event)">
        <span v-if="errors?.[`sets.${index}.repetitions`]" :id="`${id}-${index}-reps`" class="mt-1 block text-xs text-error">{{ errors[`sets.${index}.repetitions`] }}</span>
      </label>
      <label class="min-w-0 text-sm text-muted">
        Вес, кг
        <input :value="row.weight" inputmode="decimal" class="mt-1 min-h-12 w-full rounded-xl border border-default bg-default px-3 text-base text-highlighted focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60" :aria-invalid="Boolean(errors?.[`sets.${index}.working_weight_kg`])" :aria-describedby="errors?.[`sets.${index}.working_weight_kg`] ? `${id}-${index}-weight` : undefined" @input="edit(index, 'weight', $event)">
        <span v-if="errors?.[`sets.${index}.working_weight_kg`]" :id="`${id}-${index}-weight`" class="mt-1 block text-xs text-error">{{ errors[`sets.${index}.working_weight_kg`] }}</span>
      </label>
      <UButton :aria-label="`Удалить подход ${index + 1}`" icon="i-lucide-minus" color="neutral" variant="ghost" class="mt-6 min-h-11 min-w-11 justify-center" :disabled="disabled || modelValue.length <= minimum" @click="emit('update:modelValue', modelValue.filter(item => item.key !== row.key))" />
    </div>
    <p v-if="!modelValue.length" class="text-sm text-muted">Подходов пока нет</p>
    <p v-if="errors?.sets" role="alert" class="text-sm text-error">{{ errors.sets }}</p>
    <UButton label="Добавить подход" icon="i-lucide-plus" color="neutral" variant="outline" block size="lg" class="min-h-11" :disabled="disabled || modelValue.length >= 100" @click="add" />
  </fieldset>
</template>
