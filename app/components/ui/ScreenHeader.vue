<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  subtitle?: string
  back?: boolean
}>(), { subtitle: undefined, back: false })
</script>

<template>
  <header class="mb-8 flex min-w-0 items-start gap-3">
    <BackButton v-if="back" class="-ml-3 shrink-0" />
    <div class="min-w-0 flex-1">
      <h1 class="break-words text-3xl font-bold leading-tight text-highlighted sm:text-4xl">
        {{ title }}
      </h1>
      <p v-if="subtitle" class="mt-1 text-lg text-muted">
        {{ subtitle }}
      </p>
    </div>
    <div v-if="$slots.actions" class="shrink-0">
      <slot name="actions" />
    </div>
  </header>
</template>
