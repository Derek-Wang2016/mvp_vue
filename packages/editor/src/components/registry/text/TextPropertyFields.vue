<script setup lang="ts">
import { ref, watch } from 'vue'
import ColorSwatch from '../../ColorSwatch.vue'
import EditorNumberInput from '../../EditorNumberInput.vue'
import { PROP_LABEL, PROP_INPUT, PROP_NUMBER_WRAP, PROP_NUMBER_INNER, PROP_SELECT_COMPACT } from '../../propertyPanel/shared'
import type { ComponentPropertyFieldsProps } from '../types'

const props = defineProps<ComponentPropertyFieldsProps>()

const content = ref((props.comp.props.content as string) ?? '')

watch(() => props.comp.props.content, (val) => {
  content.value = (val as string) ?? ''
})

function saveContent() {
  props.updateProps({ content: content.value })
}
</script>

<template>
  <label class="block">
    <span :class="PROP_LABEL">内容</span>
    <input
      :class="PROP_INPUT"
      v-model="content"
      @blur="saveContent"
      @keydown.enter="($event.target as HTMLInputElement).blur()"
    />
  </label>
  <label class="block">
    <span :class="PROP_LABEL">字体</span>
    <select
      class="editor-select w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 outline-none transition-colors"
      :value="(comp.props.fontFamily as string) ?? 'sans-serif'"
      @change="props.updateProps({ fontFamily: ($event.target as HTMLSelectElement).value })"
    >
      <option value="sans-serif">无衬线体</option>
      <option value="serif">衬线体</option>
      <option value="monospace">等宽字体</option>
      <option value="cursive">手写体</option>
      <option value="fantasy">装饰体</option>
      <option value="Share Tech Mono">数码字体</option>
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
    <span :class="PROP_LABEL">字重</span>
    <select
      :class="PROP_SELECT_COMPACT"
      :value="(comp.props.fontWeight as string) ?? 'normal'"
      @change="props.updateProps({ fontWeight: ($event.target as HTMLSelectElement).value as 'normal' | 'bold' })"
    >
      <option value="normal">正常</option>
      <option value="bold">加粗</option>
    </select>
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
  <label class="block">
    <span :class="PROP_LABEL">最大行数</span>
    <EditorNumberInput
      :min="1"
      :max="50"
      :class="PROP_NUMBER_WRAP"
      :input-class="PROP_NUMBER_INNER"
      :model-value="(comp.props.maxRows as number) ?? 1"
      @update:model-value="props.updateProps({ maxRows: Math.max(1, Number($event)) })"
    />
  </label>
  <label class="block">
    <span :class="PROP_LABEL">分隔符</span>
    <input
      class="w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors font-mono"
      placeholder="空格"
      :value="(comp.props.separator as string) ?? ''"
      @change="props.updateProps({ separator: ($event.target as HTMLInputElement).value || undefined })"
    />
    <p class="text-[11px] text-slate-400 mt-0.5">支持转义：\n \t \\ 等</p>
  </label>
</template>
