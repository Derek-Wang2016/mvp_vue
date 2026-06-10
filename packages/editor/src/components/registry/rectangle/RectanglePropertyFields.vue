<script setup lang="ts">
import { computed } from 'vue'
import { resolveRectangleProps, type BgGradient } from '@mvp-vue/schema'
import ColorField from '../../ColorField.vue'
import EditorNumberInput from '../../EditorNumberInput.vue'
import { PROP_LABEL, PROP_HINT, PROP_NUMBER_WRAP, PROP_NUMBER_INNER } from '../../propertyPanel/shared'
import type { ComponentPropertyFieldsProps } from '../types'

const props = defineProps<ComponentPropertyFieldsProps>()

const resolved = () => resolveRectangleProps(props.comp.props)

const unifiedRadius = computed(() => {
  const r = resolved()
  const { borderRadiusTopLeft: tl, borderRadiusTopRight: tr, borderRadiusBottomRight: br, borderRadiusBottomLeft: bl } = r
  if (tl === tr && tr === br && br === bl) return tl
  return ''
})

function update(kv: Record<string, unknown>) {
  props.updateProps(kv)
}

function setUnifiedRadius(v: string) {
  const n = Math.max(0, Number(v) || 0)
  update({
    borderRadius: n,
    borderRadiusTopLeft: n,
    borderRadiusTopRight: n,
    borderRadiusBottomRight: n,
    borderRadiusBottomLeft: n,
  })
}

function setCornerRadius(
  key: 'borderRadiusTopLeft' | 'borderRadiusTopRight' | 'borderRadiusBottomRight' | 'borderRadiusBottomLeft',
  v: string,
) {
  update({ [key]: Math.max(0, Number(v) || 0) })
}
</script>

<template>
  <label class="block">
    <span :class="PROP_LABEL">渐变模式</span>
    <select
      class="editor-select w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 outline-none transition-colors"
      :value="resolved().backgroundGradient"
      @change="update({ backgroundGradient: ($event.target as HTMLSelectElement).value as BgGradient })"
    >
      <option value="none">无渐变（纯色）</option>
      <option value="linear-top">线性 — 上→下</option>
      <option value="linear-left">线性 — 左→右</option>
      <option value="linear-diagonal">线性 — 对角</option>
      <option value="radial">径向</option>
    </select>
  </label>

  <ColorField
    v-if="resolved().backgroundGradient === 'none'"
    label="背景色"
    :value="resolved().backgroundColor"
    @change="(v: string) => update({ backgroundColor: v })"
  />
  <template v-else>
    <ColorField
      label="渐变（亮）"
      :value="resolved().backgroundColor"
      @change="(v: string) => update({ backgroundColor: v })"
    />
    <ColorField
      label="渐变（暗）"
      :value="resolved().backgroundColorTo"
      @change="(v: string) => update({ backgroundColorTo: v })"
    />
  </template>

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
    <span :class="PROP_LABEL">统一圆角 (px)</span>
    <EditorNumberInput
      :min="0"
      :max="200"
      :step="1"
      :class="PROP_NUMBER_WRAP"
      :input-class="PROP_NUMBER_INNER"
      :model-value="unifiedRadius"
      placeholder="混合"
      @update:model-value="setUnifiedRadius"
    />
  </label>

  <div class="grid grid-cols-2 gap-2">
    <label class="block">
      <span :class="PROP_LABEL">左上 (px)</span>
      <EditorNumberInput
        :min="0"
        :max="200"
        :step="1"
        :class="PROP_NUMBER_WRAP"
        :input-class="PROP_NUMBER_INNER"
        :model-value="resolved().borderRadiusTopLeft"
        @update:model-value="setCornerRadius('borderRadiusTopLeft', $event)"
      />
    </label>
    <label class="block">
      <span :class="PROP_LABEL">右上 (px)</span>
      <EditorNumberInput
        :min="0"
        :max="200"
        :step="1"
        :class="PROP_NUMBER_WRAP"
        :input-class="PROP_NUMBER_INNER"
        :model-value="resolved().borderRadiusTopRight"
        @update:model-value="setCornerRadius('borderRadiusTopRight', $event)"
      />
    </label>
    <label class="block">
      <span :class="PROP_LABEL">左下 (px)</span>
      <EditorNumberInput
        :min="0"
        :max="200"
        :step="1"
        :class="PROP_NUMBER_WRAP"
        :input-class="PROP_NUMBER_INNER"
        :model-value="resolved().borderRadiusBottomLeft"
        @update:model-value="setCornerRadius('borderRadiusBottomLeft', $event)"
      />
    </label>
    <label class="block">
      <span :class="PROP_LABEL">右下 (px)</span>
      <EditorNumberInput
        :min="0"
        :max="200"
        :step="1"
        :class="PROP_NUMBER_WRAP"
        :input-class="PROP_NUMBER_INNER"
        :model-value="resolved().borderRadiusBottomRight"
        @update:model-value="setCornerRadius('borderRadiusBottomRight', $event)"
      />
    </label>
  </div>
  <p :class="PROP_HINT">四角可分别设置；统一圆角在四角相等时显示数值，不等时显示「混合」。</p>

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
