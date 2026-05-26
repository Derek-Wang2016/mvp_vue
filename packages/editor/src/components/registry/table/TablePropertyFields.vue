<script setup lang="ts">
import EditorNumberInput from '../../EditorNumberInput.vue'
import ColorField from '../../ColorField.vue'
import { PROP_LABEL, PROP_NUMBER_WRAP, PROP_NUMBER_INNER } from '../../propertyPanel/shared'
import type { ComponentPropertyFieldsProps } from '../types'

const props = defineProps<ComponentPropertyFieldsProps>()
</script>

<template>
  <label class="block">
    <span :class="PROP_LABEL">行数</span>
    <EditorNumberInput :min="1" :max="50" :class="PROP_NUMBER_WRAP" :input-class="PROP_NUMBER_INNER"
      :model-value="(comp.props.rows as number) ?? 5"
      @update:model-value="props.updateProps({ rows: Number($event) })"
    />
  </label>
  <label class="block">
    <span :class="PROP_LABEL">列数</span>
    <EditorNumberInput :min="1" :max="50" :class="PROP_NUMBER_WRAP" :input-class="PROP_NUMBER_INNER"
      :model-value="(comp.props.cols as number) ?? 5"
      @update:model-value="props.updateProps({ cols: Number($event) })"
    />
  </label>
  <label class="block">
    <span :class="PROP_LABEL">外框宽度</span>
    <EditorNumberInput :min="0" :max="20" :class="PROP_NUMBER_WRAP" :input-class="PROP_NUMBER_INNER"
      :model-value="(comp.props.outerBorderWidth as number) ?? 2"
      @update:model-value="props.updateProps({ outerBorderWidth: Number($event) })"
    />
  </label>
  <label class="block">
    <span :class="PROP_LABEL">内框宽度</span>
    <EditorNumberInput :min="0" :max="10" :class="PROP_NUMBER_WRAP" :input-class="PROP_NUMBER_INNER"
      :model-value="(comp.props.innerBorderWidth as number) ?? 1"
      @update:model-value="props.updateProps({ innerBorderWidth: Number($event) })"
    />
  </label>
  <ColorField label="外框颜色"
    :value="(comp.props.outerBorderColor as string) ?? 'transparent'"
    @change="(v: string) => props.updateProps({ outerBorderColor: v })"
  />
  <ColorField label="内框颜色"
    :value="(comp.props.innerBorderColor as string) ?? '#1e293b'"
    @change="(v: string) => props.updateProps({ innerBorderColor: v })"
  />
  <ColorField label="边缘框颜色"
    :value="(comp.props.edgeBorderColor as string) ?? '#334155'"
    @change="(v: string) => props.updateProps({ edgeBorderColor: v })"
  />
  <label class="block">
    <span :class="PROP_LABEL">表头高度</span>
    <EditorNumberInput :min="12" :max="200" :class="PROP_NUMBER_WRAP" :input-class="PROP_NUMBER_INNER"
      :model-value="(comp.props.headerHeight as number) ?? 32"
      @update:model-value="props.updateProps({ headerHeight: Number($event) })"
    />
  </label>
  <label class="block">
    <span :class="PROP_LABEL">行高</span>
    <EditorNumberInput :min="8" :max="200" :class="PROP_NUMBER_WRAP" :input-class="PROP_NUMBER_INNER"
      :model-value="(comp.props.rowHeight as number) ?? 28"
      @update:model-value="props.updateProps({ rowHeight: Number($event) })"
    />
  </label>
  <label class="block">
    <span :class="PROP_LABEL">表头字号</span>
    <EditorNumberInput :min="8" :max="80" :class="PROP_NUMBER_WRAP" :input-class="PROP_NUMBER_INNER"
      :model-value="(comp.props.headerFontSize as number) ?? 14"
      @update:model-value="props.updateProps({ headerFontSize: Number($event) })"
    />
  </label>
  <label class="block">
    <span :class="PROP_LABEL">表格字号</span>
    <EditorNumberInput :min="8" :max="80" :class="PROP_NUMBER_WRAP" :input-class="PROP_NUMBER_INNER"
      :model-value="(comp.props.cellFontSize as number) ?? 13"
      @update:model-value="props.updateProps({ cellFontSize: Number($event) })"
    />
  </label>
  <ColorField label="表头颜色"
    :value="(comp.props.headerColor as string) ?? 'rgba(30,41,59,0.6)'"
    @change="(v: string) => props.updateProps({ headerColor: v })"
  />
</template>
