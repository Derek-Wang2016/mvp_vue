<script setup lang="ts">
import type { DataSource } from '@mvp-vue/schema'
import { provideDataSources } from '../composables/useData'

const props = defineProps<{
  dataSources: DataSource[]
}>()

provideDataSources(props.dataSources)
</script>

<template>
  <slot />
</template>
