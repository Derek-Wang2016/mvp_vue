<script setup lang="ts">
import { DEFAULT_CHART_TEXT_FONT_SIZE, DEFAULT_CHART_TEXT_COLOR } from '@mvp-vue/schema'
import EditorNumberInput from '../../EditorNumberInput.vue'
import ColorField from '../../ColorField.vue'
import { PROP_LABEL, PROP_INPUT, PROP_NUMBER_WRAP, PROP_NUMBER_INNER } from '../../propertyPanel/shared'
import type { ComponentPropertyFieldsProps } from '../types'

const props = defineProps<ComponentPropertyFieldsProps>()
</script>

<template>
  <label class="block">
    <span :class="PROP_LABEL">标题</span>
    <input
      :class="PROP_INPUT"
      :value="(comp.props.title as string) ?? ''"
      @change="props.updateProps({ title: ($event.target as HTMLInputElement).value })"
    />
  </label>
  <label class="block">
    <span :class="PROP_LABEL">文字大小</span>
    <EditorNumberInput
      :min="8" :max="48"
      :class="PROP_NUMBER_WRAP"
      :input-class="PROP_NUMBER_INNER"
      :model-value="(comp.props.textFontSize as number) ?? DEFAULT_CHART_TEXT_FONT_SIZE"
      @update:model-value="props.updateProps({ textFontSize: Number($event) })"
    />
  </label>
  <ColorField
    label="文字颜色"
    :value="(comp.props.textColor as string) ?? DEFAULT_CHART_TEXT_COLOR"
    @change="(v: string) => props.updateProps({ textColor: v })"
  />
  <label class="block">
    <span :class="PROP_LABEL">分类字段</span>
    <input
      :class="PROP_INPUT"
      placeholder="自动检测 (name/symbol...)"
      :value="(comp.props.categoryField as string) ?? ''"
      @change="props.updateProps({ categoryField: ($event.target as HTMLInputElement).value || undefined })"
    />
  </label>
  <label class="block">
    <span :class="PROP_LABEL">数值字段</span>
    <input
      :class="PROP_INPUT"
      placeholder="自动检测 (market_cap/price...)"
      :value="(comp.props.valueField as string) ?? ''"
      @change="props.updateProps({ valueField: ($event.target as HTMLInputElement).value || undefined })"
    />
  </label>
  <ColorField
    v-if="comp.type === 'bar-chart'"
    label="柱子颜色"
    :value="(comp.props.color as string) ?? '#818cf8'"
    @change="(v: string) => props.updateProps({ color: v })"
  />
</template>
