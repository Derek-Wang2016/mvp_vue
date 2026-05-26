<script setup lang="ts">
import DatetimePlaceholder from '../../DatetimePlaceholder.vue'
import type { CanvasPreviewProps } from '../types'

const props = defineProps<CanvasPreviewProps>()
</script>

<template>
  <DatetimePlaceholder :comp="comp" />
</template>
