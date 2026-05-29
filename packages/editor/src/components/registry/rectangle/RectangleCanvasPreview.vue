<script setup lang="ts">
import { computed } from 'vue'
import { resolveRectangleStyle } from '@mvp-vue/schema'
import type { CanvasPreviewProps } from '../types'

const props = defineProps<CanvasPreviewProps>()

const boxStyle = computed(() => resolveRectangleStyle(props.comp.props))
</script>

<template>
  <div class="w-full h-full select-none pointer-events-none" :style="boxStyle" />
</template>
