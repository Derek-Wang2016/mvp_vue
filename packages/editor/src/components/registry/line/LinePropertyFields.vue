<script setup lang="ts">
import {
  resolveLineProps,
  LINE_ORIENTATION_OPTIONS,
  LINE_STROKE_STYLE_OPTIONS,
  LINE_CAP_OPTIONS,
  type LineOrientation,
  type LineStrokeStyle,
  type LineCap,
} from '@mvp-vue/schema'
import ColorField from '../../ColorField.vue'
import EditorNumberInput from '../../EditorNumberInput.vue'
import { PROP_LABEL, PROP_HINT, PROP_NUMBER_WRAP, PROP_NUMBER_INNER, PROP_SELECT_COMPACT } from '../../propertyPanel/shared'
import type { ComponentPropertyFieldsProps } from '../types'

const props = defineProps<ComponentPropertyFieldsProps>()

const ORIENTATION_LABELS: Record<LineOrientation, string> = {
  horizontal: '水平',
  vertical: '垂直',
  'diagonal-forward': '对角 ↘',
  'diagonal-backward': '对角 ↙',
}

const STROKE_STYLE_LABELS: Record<LineStrokeStyle, string> = {
  solid: '实线',
  dashed: '虚线',
  dotted: '点线',
}

const LINE_CAP_LABELS: Record<LineCap, string> = {
  butt: '平头',
  round: '圆头',
  square: '方头',
}

const resolved = () => resolveLineProps(props.comp.props)

function update(kv: Record<string, unknown>) {
  props.updateProps(kv)
}
</script>

<template>
  <ColorField
    label="线条颜色"
    :value="resolved().strokeColor"
    @change="(v: string) => update({ strokeColor: v })"
  />

  <label class="block">
    <span :class="PROP_LABEL">线宽 (px)</span>
    <EditorNumberInput
      :min="1"
      :max="32"
      :step="1"
      :class="PROP_NUMBER_WRAP"
      :input-class="PROP_NUMBER_INNER"
      :model-value="resolved().strokeWidth"
      @update:model-value="update({ strokeWidth: Math.max(1, Number($event) || 1) })"
    />
  </label>

  <label class="block">
    <span :class="PROP_LABEL">线形</span>
    <select
      :class="PROP_SELECT_COMPACT"
      :value="resolved().strokeStyle"
      @change="update({ strokeStyle: ($event.target as HTMLSelectElement).value })"
    >
      <option v-for="opt in LINE_STROKE_STYLE_OPTIONS" :key="opt" :value="opt">
        {{ STROKE_STYLE_LABELS[opt] }}
      </option>
    </select>
  </label>

  <label class="block">
    <span :class="PROP_LABEL">端点样式</span>
    <select
      :class="PROP_SELECT_COMPACT"
      :value="resolved().lineCap"
      @change="update({ lineCap: ($event.target as HTMLSelectElement).value })"
    >
      <option v-for="opt in LINE_CAP_OPTIONS" :key="opt" :value="opt">
        {{ LINE_CAP_LABELS[opt] }}
      </option>
    </select>
  </label>

  <label class="block">
    <span :class="PROP_LABEL">方向</span>
    <select
      :class="PROP_SELECT_COMPACT"
      :value="resolved().orientation"
      @change="update({ orientation: ($event.target as HTMLSelectElement).value })"
    >
      <option v-for="opt in LINE_ORIENTATION_OPTIONS" :key="opt" :value="opt">
        {{ ORIENTATION_LABELS[opt] }}
      </option>
    </select>
    <p :class="[PROP_HINT, 'mt-1']">线段在组件框内绘制；拖拽调整宽高可改变长度与角度范围。</p>
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
</template>
