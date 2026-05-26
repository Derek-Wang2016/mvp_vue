<script setup lang="ts">
import ChartPlaceholders from '../../ChartPlaceholders.vue'
import type { CanvasPreviewProps } from '../types'

const props = defineProps<CanvasPreviewProps>()

function chartType(): 'bar' | 'line' | 'pie' {
  if (props.comp.type === 'bar-chart') return 'bar'
  if (props.comp.type === 'line-chart') return 'line'
  return 'pie'
}
</script>

<template>
  <ChartPlaceholders
    :type="chartType()"
    :title="(comp.props.title as string) ?? '图表'"
    :text-font-size="(comp.props.textFontSize as number) ?? undefined"
    :text-color="(comp.props.textColor as string) ?? undefined"
    :color="comp.type === 'bar-chart' ? (comp.props.color as string) ?? undefined : undefined"
    :width="comp.w"
    :height="comp.h"
  />
</template>
