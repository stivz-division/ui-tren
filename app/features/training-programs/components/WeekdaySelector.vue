<script setup lang="ts">
import type { Weekday } from '#shared/types/api-tren'
import { WEEKDAY_SHORT_LABELS } from '../model/program'

const model = defineModel<Weekday | null>({ required: true })
withDefaults(defineProps<{ occupied?: Weekday[], readonly?: boolean, invalid?: boolean }>(), { occupied: () => [], readonly: false, invalid: false })
const days = [1, 2, 3, 4, 5, 6, 7] as Weekday[]
</script>

<template>
  <fieldset :aria-invalid="invalid || undefined" :tabindex="invalid ? -1 : undefined">
    <legend class="mb-3 text-base font-medium text-toned">День недели</legend>
    <div v-if="readonly" class="flex min-h-14 items-center gap-3 rounded-xl border border-default bg-muted px-4 text-lg text-muted">
      <UIcon name="i-lucide-lock" class="size-5" aria-hidden="true" />
      {{ model ? ({ 1: 'Понедельник', 2: 'Вторник', 3: 'Среда', 4: 'Четверг', 5: 'Пятница', 6: 'Суббота', 7: 'Воскресенье' }[model]) : '' }}
    </div>
    <div v-else class="grid grid-cols-4 gap-2 sm:grid-cols-7">
      <button
        v-for="day in days"
        :key="day"
        type="button"
        class="flex min-h-12 flex-col items-center justify-center rounded-xl border px-2 py-2 font-medium"
        :class="occupied.includes(day) ? 'cursor-not-allowed border-dashed border-default bg-muted text-muted' : model === day ? 'border-primary bg-primary text-inverted' : 'border-default bg-elevated text-toned'"
        :disabled="occupied.includes(day)"
        :aria-pressed="model === day"
        :aria-label="occupied.includes(day) ? `${WEEKDAY_SHORT_LABELS[day]}. На этот день уже есть программа` : WEEKDAY_SHORT_LABELS[day]"
        @click="model = day"
      >
        <span>{{ WEEKDAY_SHORT_LABELS[day] }}</span>
        <span v-if="occupied.includes(day)" class="text-xs font-normal" aria-hidden="true">Занят</span>
      </button>
    </div>
    <p v-if="!readonly && occupied.length" class="mt-3 text-sm text-muted">
      Занятые дни недоступны: на них уже есть тренировка.
    </p>
  </fieldset>
</template>
