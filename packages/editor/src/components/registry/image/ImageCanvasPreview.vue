<script setup lang="ts">
import type { CanvasPreviewProps } from '../types'

const props = defineProps<CanvasPreviewProps>()
</script>

<template>
  <img
    v-if="comp.props.src"
    :src="comp.props.src as string"
    :alt="(comp.props.alt as string) ?? ''"
    class="w-full h-full object-cover"
    draggable="false"
  />
  <div v-else class="w-full h-full bg-gray-600 flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-500">
    图片占位
  </div>
</template>
