<script setup lang="ts">
import type { PageComponent } from '@mvp-vue/schema'

defineProps<{ comp: PageComponent }>()
</script>

<template>
  <img
    v-if="comp.props.src"
    :src="(comp.props.src as string)"
    :alt="(comp.props.alt as string) ?? ''"
    class="w-full h-full object-cover"
    draggable="false"
  />
</template>
