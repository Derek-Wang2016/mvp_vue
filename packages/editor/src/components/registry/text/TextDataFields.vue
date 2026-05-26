<script setup lang="ts">
import { PROP_LABEL } from '../../propertyPanel/shared'
import type { ComponentDataFieldsProps } from '../types'

const props = defineProps<ComponentDataFieldsProps>()
</script>

<template>
  <label v-if="dataSourceId && dataSources.length > 0" class="block">
    <span :class="PROP_LABEL">文本字段</span>
    <input
      class="w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors"
      placeholder="自动 (第一个值)"
      :value="(comp.props.textField as string) ?? ''"
      @change="props.updateProps({ textField: ($event.target as HTMLInputElement).value || undefined })"
    />
  </label>
</template>
