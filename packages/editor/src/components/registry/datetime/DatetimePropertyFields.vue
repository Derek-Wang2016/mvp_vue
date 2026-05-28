<script setup lang="ts">
import ColorSwatch from '../../ColorSwatch.vue'
import EditorNumberInput from '../../EditorNumberInput.vue'
import { PROP_LABEL, PROP_NUMBER_WRAP, PROP_NUMBER_INNER } from '../../propertyPanel/shared'
import { FONT_FAMILY_SELECT_CLASS, FONT_FAMILY_OPTIONS } from '../../propertyPanel/editorFontOptions'
import type { ComponentPropertyFieldsProps } from '../types'

const props = defineProps<ComponentPropertyFieldsProps>()
</script>

<template>
  <label class="block">
    <span :class="PROP_LABEL">日期格式</span>
    <select
      class="editor-select w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 outline-none transition-colors"
      :value="(comp.props.format as string) ?? 'YYYY年MM月DD日 HH:mm'"
      @change="(e: Event) => {
        const fmt = (e.target as HTMLSelectElement).value
        const updates: Record<string, unknown> = { format: fmt }
        if (fmt === 'YYYY-MM-DD HH:mm:ss') updates.fontFamily = 'DSEG7 Classic'
        props.updateProps(updates)
      }"
    >
      <option value="YYYY年MM月DD日 HH:mm">YYYY年MM月DD日 HH:mm</option>
      <option value="YYYY年MM月DD日 HH:mm:ss">YYYY年MM月DD日 HH:mm:ss</option>
      <option value="YYYY年MM月DD日 dddd HH:mm">YYYY年MM月DD日 dddd HH:mm</option>
      <option value="YYYY-MM-DD HH:mm:ss">YYYY-MM-DD HH:mm:ss</option>
    </select>
  </label>
  <label class="block">
    <span :class="PROP_LABEL">字体</span>
    <select
      :class="FONT_FAMILY_SELECT_CLASS"
      :value="(comp.props.fontFamily as string) ?? 'sans-serif'"
      @change="props.updateProps({ fontFamily: ($event.target as HTMLSelectElement).value })"
    >
      <option v-for="opt in FONT_FAMILY_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
  </label>
  <label class="block">
    <span :class="PROP_LABEL">字号</span>
    <EditorNumberInput
      :class="PROP_NUMBER_WRAP"
      :input-class="PROP_NUMBER_INNER"
      :model-value="(comp.props.fontSize as number) ?? 20"
      @update:model-value="props.updateProps({ fontSize: Number($event) })"
    />
  </label>
  <label class="block">
    <span :class="PROP_LABEL">颜色</span>
    <div class="flex items-center gap-2 mt-1">
      <ColorSwatch
        class="w-7 h-7 shrink-0 border border-white/10"
        :value="(comp.props.color as string) ?? '#ffffff'"
        @change="(hex: string) => props.updateProps({ color: hex })"
      />
      <span class="text-xs text-slate-400 font-mono">
        {{ (comp.props.color as string) ?? '#ffffff' }}
      </span>
    </div>
  </label>
</template>
