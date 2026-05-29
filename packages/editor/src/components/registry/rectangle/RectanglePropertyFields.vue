<script setup lang="ts">
import { resolveRectangleProps } from '@mvp-vue/schema'
import ColorField from '../../ColorField.vue'
import EditorNumberInput from '../../EditorNumberInput.vue'
import { PROP_LABEL, PROP_HINT, PROP_NUMBER_WRAP, PROP_NUMBER_INNER } from '../../propertyPanel/shared'
import type { ComponentPropertyFieldsProps } from '../types'

const props = defineProps<ComponentPropertyFieldsProps>()

const resolved = () => resolveRectangleProps(props.comp.props)

function update(kv: Record<string, unknown>) {
  props.updateProps(kv)
}
</script>

<template>
  <ColorField
    label="背景色"
    :value="resolved().backgroundColor"
    @change="(v: string) => update({ backgroundColor: v })"
  />

  <label class="flex items-center gap-2 mt-2">
    <input
      type="checkbox"
      class="editor-checkbox shrink-0"
      :checked="resolved().borderEnabled"
      @change="update({ borderEnabled: ($event.target as HTMLInputElement).checked })"
    />
    <span :class="PROP_LABEL">显示边框</span>
  </label>

  <template v-if="resolved().borderEnabled">
    <ColorField
      label="边框颜色"
      :value="resolved().borderColor"
      @change="(v: string) => update({ borderColor: v })"
    />
    <label class="block">
      <span :class="PROP_LABEL">边框宽度 (px)</span>
      <EditorNumberInput
        :min="0"
        :max="32"
        :step="1"
        :class="PROP_NUMBER_WRAP"
        :input-class="PROP_NUMBER_INNER"
        :model-value="resolved().borderWidth"
        @update:model-value="update({ borderWidth: Math.max(0, Number($event) || 0) })"
      />
    </label>
  </template>

  <label class="block">
    <span :class="PROP_LABEL">圆角 (px)</span>
    <EditorNumberInput
      :min="0"
      :max="200"
      :step="1"
      :class="PROP_NUMBER_WRAP"
      :input-class="PROP_NUMBER_INNER"
      :model-value="resolved().borderRadius"
      @update:model-value="update({ borderRadius: Math.max(0, Number($event) || 0) })"
    />
  </label>

  <label class="block">
    <span :class="PROP_LABEL">透明比例 (%)</span>
    <EditorNumberInput
      :min="0"
      :max="100"
      :step="1"
      :class="PROP_NUMBER_WRAP"
      :input-class="PROP_NUMBER_INNER"
      :model-value="Math.round(resolved().opacity * 100)"
      @update:model-value="update({ opacity: Math.min(1, Math.max(0, Number($event) / 100)) })"
    />
  </label>
  <p :class="PROP_HINT">0% 完全透明，100% 不透明；作用于整块矩形（含背景与边框）。</p>
</template>
