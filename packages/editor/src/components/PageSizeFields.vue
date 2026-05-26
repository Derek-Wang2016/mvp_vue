<script setup lang="ts">
import { computed } from 'vue'
import {
  PAGE_SIZE_PRESETS,
  presetIdForSize,
  type PageSizePresetId,
} from '../pageSizePresets'
import EditorNumberInput from './EditorNumberInput.vue'

const props = withDefaults(defineProps<{
  width: number
  height: number
  compact?: boolean
}>(), {
  compact: false,
})

const emit = defineEmits<{
  change: [width: number, height: number]
}>()

const presetId = computed<PageSizePresetId>(() => presetIdForSize(props.width, props.height))

function handlePresetChange(e: Event) {
  const id = (e.target as HTMLSelectElement).value as PageSizePresetId
  if (id === 'custom') return
  const preset = PAGE_SIZE_PRESETS.find((p) => p.id === id)
  if (preset) emit('change', preset.width, preset.height)
}

const labelClass = computed(() =>
  props.compact
    ? 'text-[11px] font-medium text-slate-300'
    : 'text-[11px] font-medium text-slate-300 uppercase tracking-wider'
)

const numberWrapClass = 'w-full mt-1'
const numberInnerClass =
  'w-full bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors'
</script>

<template>
  <div :class="compact ? 'space-y-2' : 'space-y-3'">
    <label class="block">
      <span :class="labelClass">页面尺寸</span>
      <select
        class="editor-select w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 outline-none transition-colors"
        :value="presetId"
        @change="handlePresetChange"
      >
        <option v-for="p in PAGE_SIZE_PRESETS" :key="p.id" :value="p.id">
          {{ p.label }}
        </option>
      </select>
    </label>
    <div class="grid grid-cols-2 gap-2">
      <label class="block">
        <span :class="labelClass">宽度</span>
        <EditorNumberInput
          :min="320"
          :max="7680"
          :class="numberWrapClass"
          :input-class="numberInnerClass"
          :model-value="width"
          @update:model-value="emit('change', Number($event), height)"
        />
      </label>
      <label class="block">
        <span :class="labelClass">高度</span>
        <EditorNumberInput
          :min="240"
          :max="4320"
          :class="numberWrapClass"
          :input-class="numberInnerClass"
          :model-value="height"
          @update:model-value="emit('change', width, Number($event))"
        />
      </label>
    </div>
  </div>
</template>
