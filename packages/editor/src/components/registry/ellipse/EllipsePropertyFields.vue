<script setup lang="ts">
import { resolveEllipseProps } from '@mvp-vue/schema'
import ColorField from '../../ColorField.vue'
import EditorNumberInput from '../../EditorNumberInput.vue'
import { PROP_LABEL, PROP_HINT, PROP_NUMBER_WRAP, PROP_NUMBER_INNER } from '../../propertyPanel/shared'
import type { ComponentPropertyFieldsProps } from '../types'

const props = defineProps<ComponentPropertyFieldsProps>()

const resolved = () => resolveEllipseProps(props.comp.props)

function update(kv: Record<string, unknown>) {
  props.updateProps(kv)
}
</script>

<template>
  <ColorField
    label="底色"
    :value="resolved().backgroundColor"
    @change="(v: string) => update({ backgroundColor: v })"
  />

  <ColorField
    label="外框颜色"
    :value="resolved().borderColor"
    @change="(v: string) => update({ borderColor: v })"
  />

  <label class="block">
    <span :class="PROP_LABEL">外框宽度 (px)</span>
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
  <p :class="PROP_HINT">宽高相等时为正圆，不等时为椭圆；外框沿外接矩形内切绘制。</p>
</template>
