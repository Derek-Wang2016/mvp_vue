<script setup lang="ts">
import { PROP_LABEL, PROP_INPUT } from '../../propertyPanel/shared'
import type { ComponentPropertyFieldsProps } from '../types'

const props = defineProps<ComponentPropertyFieldsProps>()
</script>

<template>
  <label class="block">
    <span :class="PROP_LABEL">表盘公司名</span>
    <input
      :class="PROP_INPUT"
      :value="(comp.props.brandName as string) ?? '飞星科技'"
      @change="props.updateProps({ brandName: ($event.target as HTMLInputElement).value })"
      placeholder="飞星科技"
    />
  </label>
  <label class="block">
    <span :class="PROP_LABEL">主题</span>
    <select
      class="editor-select w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 outline-none transition-colors"
      :value="(comp.props.theme as string) ?? 'dark'"
      @change="props.updateProps({ theme: ($event.target as HTMLSelectElement).value })"
    >
      <option value="dark">暗色</option>
      <option value="light">亮色</option>
      <option value="tech-blue">科技蓝</option>
    </select>
  </label>
  <label class="block">
    <span :class="PROP_LABEL">秒针</span>
    <select
      class="editor-select w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 outline-none transition-colors"
      :value="(comp.props.showSeconds as boolean) !== false ? 'true' : 'false'"
      @change="props.updateProps({ showSeconds: ($event.target as HTMLSelectElement).value === 'true' })"
    >
      <option value="true">显示</option>
      <option value="false">隐藏</option>
    </select>
  </label>
</template>
