<script setup lang="ts">
import { exerciseVideo } from '../model/video'
const props = defineProps<{ url: string | null, name: string }>()
const video = computed(() => exerciseVideo(props.url))
const failed = shallowRef(false)
watch(() => props.url, () => { failed.value = false })
</script>

<template>
  <div class="space-y-3">
    <template v-if="video">
      <iframe
        v-if="video.kind === 'youtube'"
        :src="video.src"
        :title="`Видео: ${name}`"
        class="aspect-video min-h-[200px] w-full rounded-xl border-0 bg-elevated"
        allow="encrypted-media; fullscreen; picture-in-picture"
        referrerpolicy="strict-origin-when-cross-origin"
        allowfullscreen
      />
      <video v-else-if="video.kind === 'file' && !failed" :src="video.src" :aria-label="`Видео: ${name}`" controls playsinline preload="metadata" class="aspect-video w-full rounded-xl bg-elevated" @error="failed = true" />
      <p v-if="failed || video.kind === 'link'" class="text-sm text-muted">Посмотрите видео по ссылке.</p>
      <UButton :to="video.href" target="_blank" rel="noopener noreferrer" label="Открыть видео" icon="i-lucide-external-link" variant="soft" color="neutral" class="min-h-11" />
    </template>
    <p v-else class="rounded-xl bg-elevated p-4 text-sm text-muted">{{ url ? 'Видео недоступно' : 'Видео пока не добавлено' }}</p>
  </div>
</template>
