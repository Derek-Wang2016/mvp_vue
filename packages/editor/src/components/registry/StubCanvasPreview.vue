<script setup lang="ts">
import type { CanvasPreviewProps } from './types'
const props = defineProps<CanvasPreviewProps>()
</script>

<template>
  <div class="w-full h-full flex items-center justify-center bg-white/5 border border-white/10 rounded text-xs text-slate-500 select-none">
    {{ comp.type }}
  </div>
</template>
