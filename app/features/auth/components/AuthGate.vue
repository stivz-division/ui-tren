<script setup lang="ts">
import { useAuth } from '../composables/useAuth'

const { status, errorMessage, bootstrap } = useAuth()

onMounted(() => {
  void bootstrap().catch(() => undefined)
})
</script>

<template>
  <div
    v-if="status !== 'authenticated'"
    class="fixed inset-0 z-50 flex min-h-dvh items-center justify-center bg-default p-5"
  >
    <div class="w-full max-w-sm text-center">
      <template v-if="status === 'error'">
        <UIcon
          name="i-lucide-circle-alert"
          class="mx-auto mb-4 size-10 text-error"
          aria-hidden="true"
        />
        <p
          class="mb-5 text-base text-toned"
          role="alert"
        >
          {{ errorMessage }}
        </p>
        <UButton
          label="Повторить"
          icon="i-lucide-refresh-cw"
          size="xl"
          @click="bootstrap"
        />
      </template>
      <template v-else>
        <UIcon
          name="i-lucide-dumbbell"
          class="mx-auto mb-4 size-10 text-primary"
          aria-hidden="true"
        />
        <p class="text-base text-muted">
          Загружаем расписание…
        </p>
      </template>
    </div>
  </div>
  <div
    :inert="status !== 'authenticated'"
    :aria-hidden="status !== 'authenticated'"
    :class="status === 'authenticated' ? '' : 'invisible h-0 overflow-hidden'"
  >
    <slot />
  </div>
</template>
