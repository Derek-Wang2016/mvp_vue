<script setup lang="ts">
import type { CardFieldConfig } from '@mvp-vue/schema'
import ColorSwatch from '../../ColorSwatch.vue'
import { PROP_INPUT, PROP_SELECT_COMPACT } from '../../propertyPanel/shared'

defineProps<{
  field: CardFieldConfig
}>()

const emit = defineEmits<{
  update: [patch: Partial<CardFieldConfig>]
}>()

function patch(p: Partial<CardFieldConfig>) {
  emit('update', p)
}
</script>

<template>
  <div class="mb-1 border-t border-white/10 pt-2 mt-1">
    <span class="text-[11px] font-medium text-slate-400 block mb-1">标签样式</span>

    <div class="flex gap-1 items-start mb-1">
      <div class="flex-1">
        <span class="text-[11px] font-medium text-slate-500 block">字号</span>
        <input
          class="w-full mt-0.5 bg-white/[0.08] border border-white/15 rounded px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
          placeholder="继承值字号"
          :value="field.labelFontSize ?? ''"
          @input="patch({ labelFontSize: ($event.target as HTMLInputElement).value || undefined })"
        />
      </div>
      <div class="flex-1">
        <span class="text-[11px] font-medium text-slate-500 block">粗细</span>
        <select
          :class="[PROP_SELECT_COMPACT, 'focus:ring-1 focus:ring-indigo-400/30']"
          :value="field.labelFontWeight ?? ''"
          @change="patch({ labelFontWeight: (($event.target as HTMLSelectElement).value || undefined) as CardFieldConfig['labelFontWeight'] })"
        >
          <option value="">继承值粗细</option>
          <option value="normal">常规</option>
          <option value="bold">粗体</option>
        </select>
      </div>
    </div>

    <div class="flex gap-1 items-start mb-1">
      <div class="flex-1">
        <span class="text-[11px] font-medium text-slate-500 block">文字色</span>
        <div class="flex gap-1 mt-0.5">
          <ColorSwatch
            class="w-8 h-8 shrink-0 border border-white/10"
            :value="field.labelTextColor ?? '#94a3b8'"
            @change="(labelTextColor: string) => patch({ labelTextColor })"
          />
          <input
            class="w-0 flex-1 bg-white/[0.08] border border-white/15 rounded px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 font-mono min-w-0"
            :value="field.labelTextColor ?? ''"
            placeholder="继承值文字色"
            @input="patch({ labelTextColor: ($event.target as HTMLInputElement).value || undefined })"
          />
        </div>
      </div>
      <div class="flex-1">
        <span class="text-[11px] font-medium text-slate-500 block">底色</span>
        <div class="flex gap-1 mt-0.5">
          <ColorSwatch
            class="w-8 h-8 shrink-0 border border-white/10"
            :value="field.labelBgColor ?? '#000000'"
            @change="(labelBgColor: string) => patch({ labelBgColor })"
          />
          <input
            class="w-0 flex-1 bg-white/[0.08] border border-white/15 rounded px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 font-mono min-w-0"
            :value="field.labelBgColor ?? ''"
            placeholder="无 / DICT:字段名"
            @input="patch({ labelBgColor: ($event.target as HTMLInputElement).value || undefined })"
          />
        </div>
      </div>
    </div>

    <label class="block">
      <span class="text-[11px] font-medium text-slate-500 block">对齐</span>
      <select
        :class="[PROP_SELECT_COMPACT, 'focus:ring-1 focus:ring-indigo-400/30']"
        :value="field.labelTextAlign ?? ''"
        @change="patch({ labelTextAlign: (($event.target as HTMLSelectElement).value || undefined) as CardFieldConfig['labelTextAlign'] })"
      >
        <option value="">布局默认</option>
        <option value="left">← 左</option>
        <option value="center">◼ 中</option>
        <option value="right">→ 右</option>
      </select>
    </label>
  </div>
</template>
