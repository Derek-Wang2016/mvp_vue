<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../../stores/editorStore'
import { storeToRefs } from 'pinia'
import EditorNumberInput from '../EditorNumberInput.vue'
import { PROP_LABEL, PROP_NUMBER_WRAP, PROP_NUMBER_INNER, PROP_HINT } from './shared'
import { clampGroupBounds } from '../../utils/componentGroup'

const props = withDefaults(defineProps<{
  disabled?: boolean
}>(), {
  disabled: false,
})

const store = useEditorStore()
const { activeGroupId, activeGroupBounds, fullGroupSelection, pageWidth, pageHeight } = storeToRefs(store)

const memberCount = computed(() => fullGroupSelection.value.memberIds.length)

function applyPosition(patch: { x?: number; y?: number }) {
  if (props.disabled || !activeGroupId.value || !activeGroupBounds.value) return
  const bounds = activeGroupBounds.value
  const x = patch.x ?? bounds.x
  const y = patch.y ?? bounds.y
  store.moveGroupByBounds(activeGroupId.value, x, y)
}

function applySize(patch: { w?: number; h?: number }) {
  if (props.disabled || !activeGroupId.value || !activeGroupBounds.value) return
  const bounds = activeGroupBounds.value
  const next = clampGroupBounds(
    {
      x: bounds.x,
      y: bounds.y,
      w: patch.w ?? bounds.w,
      h: patch.h ?? bounds.h,
    },
    pageWidth.value,
    pageHeight.value,
  )
  store.resizeGroup(activeGroupId.value, next)
}

function ungroup() {
  if (props.disabled) return
  store.ungroupSelectedComponents()
}
</script>

<template>
  <div v-if="activeGroupBounds" class="space-y-3">
    <p :class="PROP_LABEL">位置与尺寸（外接矩形）</p>
    <div class="grid grid-cols-2 gap-2">
      <label class="block min-w-0">
        <span class="text-[10px] text-slate-500">X</span>
        <EditorNumberInput
          :min="0"
          :max="pageWidth"
          :step="1"
          :class="PROP_NUMBER_WRAP"
          :input-class="PROP_NUMBER_INNER"
          :model-value="activeGroupBounds.x"
          :disabled="disabled"
          @update:model-value="applyPosition({ x: Number($event) })"
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
          :model-value="activeGroupBounds.y"
          :disabled="disabled"
          @update:model-value="applyPosition({ y: Number($event) })"
        />
      </label>
      <label class="block min-w-0">
        <span class="text-[10px] text-slate-500">W</span>
        <EditorNumberInput
          :min="30"
          :max="pageWidth"
          :step="1"
          :class="PROP_NUMBER_WRAP"
          :input-class="PROP_NUMBER_INNER"
          :model-value="activeGroupBounds.w"
          :disabled="disabled"
          @update:model-value="applySize({ w: Number($event) })"
        />
      </label>
      <label class="block min-w-0">
        <span class="text-[10px] text-slate-500">H</span>
        <EditorNumberInput
          :min="20"
          :max="pageHeight"
          :step="1"
          :class="PROP_NUMBER_WRAP"
          :input-class="PROP_NUMBER_INNER"
          :model-value="activeGroupBounds.h"
          :disabled="disabled"
          @update:model-value="applySize({ h: Number($event) })"
        />
      </label>
    </div>
    <p :class="PROP_HINT">组合内子组件属性不可编辑；缩放为等比例。</p>

    <button
      type="button"
      class="w-full text-[11px] py-1.5 rounded border border-violet-400/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 transition-colors disabled:opacity-40"
      :disabled="disabled"
      @click="ungroup"
    >
      拆分组合（{{ memberCount }} 个组件）
    </button>
  </div>
</template>
