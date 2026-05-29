<script setup lang="ts">
import { computed } from 'vue'
import type { PageComponent } from '@mvp-vue/schema'
import { resolveLineSvgAttrs } from '@mvp-vue/schema'

const props = defineProps<{ comp: PageComponent }>()

const svg = computed(() => resolveLineSvgAttrs(props.comp.props))
</script>

<template>
  <svg
    class="w-full h-full overflow-visible"
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
