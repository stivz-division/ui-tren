<script setup lang="ts">
const props = withDefaults(defineProps<{ fallback?: string }>(), { fallback: '/programs' })
const router = useRouter()

function goBack() {
  if (window.history.length > 1) router.back()
  else void navigateTo(props.fallback)
}
</script>

<template>
  <UButton
    aria-label="Назад"
    icon="i-lucide-chevron-left"
    color="neutral"
    variant="ghost"
    size="xl"
    class="min-h-11 min-w-11 justify-center"
    @click="goBack"
  />
</template>
