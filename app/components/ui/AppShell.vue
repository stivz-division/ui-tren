<script setup lang="ts">
const route = useRoute()
const hasBottomNavigation = computed(() => route.path === '/' || route.path === '/programs' || route.path === '/workout-history')
</script>

<template>
  <div class="min-h-dvh bg-default pt-[env(safe-area-inset-top)]">
    <main
      id="main-content"
      class="mx-auto w-full max-w-[480px] px-5 pt-6"
      :class="hasBottomNavigation ? 'pb-[calc(6.5rem+env(safe-area-inset-bottom))]' : 'pb-[calc(2rem+env(safe-area-inset-bottom))]'"
    >
      <slot />
    </main>
    <BottomNavigation v-if="hasBottomNavigation" />
  </div>
</template>
