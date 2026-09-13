<script setup lang="ts">
import type { PlannedSet, PlannedSetInput } from '#shared/types/api-tren'
import { createSetRows, parseSetRows } from '~/utils/set-draft'

const props = defineProps<{ name: string, sets: PlannedSet[], pending: boolean, error?: string, serverErrors?: Record<string, string> }>()
const emit = defineEmits<{ save: [sets: PlannedSetInput[]], close: [] }>()
const rows = ref(createSetRows(props.sets))
const errors = computed(() => ({ ...props.serverErrors, ...parseSetRows(rows.value, 1).errors }))
function save() {
  const result = parseSetRows(rows.value, 1)
  if (!Object.keys(result.errors).length) emit('save', result.sets)
}
</script>

<template>
  <UModal :open="true" :title="name" description="Измените подходы в программе тренировок" :dismissible="!pending" :close="!pending" :ui="{ content: 'max-w-md' }" @update:open="!$event && emit('close')">
    <template #body>
      <UAlert v-if="error" class="mb-4" color="error" :title="error" />
      <SetEditor v-model="rows" :minimum="1" :disabled="pending" :errors="errors" />
    </template>
    <template #footer>
      <div class="grid w-full grid-cols-2 gap-3">
        <UButton label="Отмена" color="neutral" variant="outline" block size="xl" :disabled="pending" @click="emit('close')" />
        <UButton label="Сохранить" block size="xl" :loading="pending" :disabled="pending || Object.keys(parseSetRows(rows, 1).errors).length > 0" @click="save" />
      </div>
    </template>
  </UModal>
</template>
