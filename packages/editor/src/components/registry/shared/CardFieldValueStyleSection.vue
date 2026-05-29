<script setup lang="ts">
import type { CardFieldConfig } from '@mvp-vue/schema'
import ColorSwatch from '../../ColorSwatch.vue'
import { PROP_SELECT_COMPACT } from '../../propertyPanel/shared'

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
  <div class="mb-1">
    <span class="text-[11px] font-medium text-slate-400 block mb-1">值样式</span>

    <div class="flex gap-1 items-start mb-1">
      <div class="flex-1">
        <span class="text-[11px] font-medium text-slate-500 block">字号</span>
        <input
          class="w-full mt-0.5 bg-white/[0.08] border border-white/15 rounded px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
          placeholder="14px"
          :value="field.fontSize ?? ''"
          @input="patch({ fontSize: ($event.target as HTMLInputElement).value || undefined })"
        />
      </div>
      <div class="flex-1">
        <span class="text-[11px] font-medium text-slate-500 block">粗细</span>
        <select
          :class="[PROP_SELECT_COMPACT, 'focus:ring-1 focus:ring-indigo-400/30']"
          :value="field.fontWeight ?? ''"
          @change="patch({ fontWeight: (($event.target as HTMLSelectElement).value || undefined) as CardFieldConfig['fontWeight'] })"
        >
          <option value="">默认</option>
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
            :value="field.textColor ?? '#cbd5e1'"
            @change="(textColor: string) => patch({ textColor })"
          />
          <input
            class="w-0 flex-1 bg-white/[0.08] border border-white/15 rounded px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 font-mono min-w-0"
            :value="field.textColor ?? ''"
            placeholder="#cbd5e1"
            @input="patch({ textColor: ($event.target as HTMLInputElement).value || undefined })"
          />
        </div>
      </div>
      <div class="flex-1">
        <span class="text-[11px] font-medium text-slate-500 block">底色</span>
        <div class="flex gap-1 mt-0.5">
          <ColorSwatch
            class="w-8 h-8 shrink-0 border border-white/10"
            :value="field.bgColor ?? '#000000'"
            @change="(bgColor: string) => patch({ bgColor })"
          />
          <input
            class="w-0 flex-1 bg-white/[0.08] border border-white/15 rounded px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 font-mono min-w-0"
            :value="field.bgColor ?? ''"
            placeholder="#000 或 DICT:字段名"
            @input="patch({ bgColor: ($event.target as HTMLInputElement).value || undefined })"
          />
        </div>
      </div>
    </div>

    <label class="block flex-1 mb-1">
      <span class="text-[11px] font-medium text-slate-500 block">对齐</span>
      <select
        :class="[PROP_SELECT_COMPACT, 'focus:ring-1 focus:ring-indigo-400/30']"
        :value="field.textAlign ?? ''"
        @change="patch({ textAlign: (($event.target as HTMLSelectElement).value || undefined) as CardFieldConfig['textAlign'] })"
      >
        <option value="">默认</option>
        <option value="left">← 左</option>
        <option value="center">◼ 中</option>
        <option value="right">→ 右</option>
      </select>
    </label>
  </div>
</template>
