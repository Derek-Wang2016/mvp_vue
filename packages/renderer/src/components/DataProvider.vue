<script setup lang="ts">
import { toRef } from 'vue'
import type { DataSource } from '@mvp-vue/schema'
import { useProvideDataSources } from '../composables/useData'

const props = defineProps<{
  dataSources: DataSource[]
}>()

const dataSourcesRef = toRef(props, 'dataSources')
useProvideDataSources(() => dataSourcesRef.value ?? [])
</script>

<template>
  <slot />
</template>
