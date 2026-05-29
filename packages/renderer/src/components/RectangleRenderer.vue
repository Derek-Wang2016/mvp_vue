<script setup lang="ts">
import { computed } from 'vue'
import type { PageComponent } from '@mvp-vue/schema'
import { resolveRectangleStyle } from '@mvp-vue/schema'

const props = defineProps<{ comp: PageComponent }>()

const boxStyle = computed(() => resolveRectangleStyle(props.comp.props))
</script>

<template>
  <div class="w-full h-full" :style="boxStyle" />
</template>
