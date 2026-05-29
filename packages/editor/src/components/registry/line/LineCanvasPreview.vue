<script setup lang="ts">
import { computed } from 'vue'
import { resolveLineSvgAttrs } from '@mvp-vue/schema'
import type { CanvasPreviewProps } from '../types'

const props = defineProps<CanvasPreviewProps>()

const svg = computed(() => resolveLineSvgAttrs(props.comp.props))
</script>

<template>
  <svg
    class="w-full h-full select-none pointer-events-none overflow-visible"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <line
      :x1="svg.endpoints.x1"
      :y1="svg.endpoints.y1"
      :x2="svg.endpoints.x2"
      :y2="svg.endpoints.y2"
      fill="none"
      :stroke="svg.stroke"
      :stroke-width="svg.strokeWidth"
      :stroke-dasharray="svg.strokeDasharray"
      :stroke-linecap="svg.strokeLinecap"
      :opacity="svg.opacity"
      vector-effect="non-scaling-stroke"
    />
  </svg>
</template>
