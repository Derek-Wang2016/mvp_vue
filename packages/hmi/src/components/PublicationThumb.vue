<script setup lang="ts">
import { computed } from 'vue'
import Stage from './Stage.vue'
import type { HmiDocument } from '../types'

const props = defineProps<{ doc: HmiDocument }>()

const preview = computed(() => ({ ...props.doc, active: 'index' }))
const scale = computed(() => 320 / Math.max(1, preview.value.screen.w))
const height = computed(() => Math.round(preview.value.screen.h * scale.value))
</script>

<template>
  <div class="overflow-hidden rounded bg-black" :style="{ width: '320px', height: height + 'px' }">
    <div
      class="origin-top-left pointer-events-none"
      :style="{ width: preview.screen.w + 'px', height: preview.screen.h + 'px', transform: `scale(${scale})` }"
    >
      <Stage :doc="preview" :selection="null" :selected-keys="[]" :drag="null" :show-position="false" />
    </div>
  </div>
</template>
