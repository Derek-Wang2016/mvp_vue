<script setup lang="ts">
import type { PageComponent } from '@mvp-vue/schema'
import { useEditorStore } from '../../stores/editorStore'
import { storeToRefs } from 'pinia'
import EditorNumberInput from '../EditorNumberInput.vue'
import { PROP_LABEL, PROP_NUMBER_WRAP, PROP_NUMBER_INNER } from './shared'
import { clampComponentLayout } from '../../utils/componentLayout'

const props = withDefaults(defineProps<{
  comp: PageComponent
  disabled?: boolean
}>(), {
  disabled: false,
})

const store = useEditorStore()
const { pageWidth, pageHeight } = storeToRefs(store)

function apply(patch: Partial<{ x: number; y: number; w: number; h: number }>) {
  if (props.disabled) return
  const next = clampComponentLayout(
    {
      x: props.comp.x,
      y: props.comp.y,
      w: props.comp.w,
      h: props.comp.h,
      ...patch,
    },
    pageWidth.value,
    pageHeight.value,
  )
  store.resizeComponent(props.comp.id, next.x, next.y, next.w, next.h)
}
</script>

<template>
  <div class="space-y-2">
    <p :class="PROP_LABEL">位置与尺寸</p>
    <div class="grid grid-cols-2 gap-2">
      <label class="block min-w-0">
        <span class="text-[10px] text-slate-500">X</span>
        <EditorNumberInput
          :min="0"
          :max="pageWidth"
          :step="1"
          :class="PROP_NUMBER_WRAP"
          :input-class="PROP_NUMBER_INNER"
          :model-value="comp.x"
          :disabled="disabled"
          @update:model-value="apply({ x: Number($event) })"
        />
      </label>
      <label class="block min-w-0">
        <span class="text-[10px] text-slate-500">Y</span>
        <EditorNumberInput
          :min="0"
          :max="pageHeight"
          :step="1"
          :class="PROP_NUMBER_WRAP"
          :input-class="PROP_NUMBER_INNER"
          :model-value="comp.y"
          :disabled="disabled"
          @update:model-value="apply({ y: Number($event) })"
        />
      </label>
      <label class="block min-w-0">
        <span class="text-[10px] text-slate-500">宽</span>
        <EditorNumberInput
          :min="30"
          :step="1"
          :class="PROP_NUMBER_WRAP"
          :input-class="PROP_NUMBER_INNER"
          :model-value="comp.w"
          :disabled="disabled"
          @update:model-value="apply({ w: Number($event) })"
        />
      </label>
      <label class="block min-w-0">
        <span class="text-[10px] text-slate-500">高</span>
        <EditorNumberInput
          :min="20"
          :step="1"
          :class="PROP_NUMBER_WRAP"
          :input-class="PROP_NUMBER_INNER"
          :model-value="comp.h"
          :disabled="disabled"
          @update:model-value="apply({ h: Number($event) })"
        />
      </label>
    </div>
  </div>
</template>
