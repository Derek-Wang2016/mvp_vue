<script setup lang="ts">
import AnalogClockPlaceholder from '../../AnalogClockPlaceholder.vue'
import type { CanvasPreviewProps } from '../types'

const props = defineProps<CanvasPreviewProps>()
</script>

<template>
  <AnalogClockPlaceholder :comp="comp" />
</template>
