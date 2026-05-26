<script setup lang="ts">
import {
  DEFAULT_CHART_TEXT_FONT_SIZE,
  DEFAULT_CHART_TEXT_COLOR,
  MAP_PROVINCE_OPTIONS,
  MAP_SYMBOL_PRESETS,
  MAP_VISUAL_STYLE_OPTIONS,
  DEFAULT_MAP_PROVINCE_ADCODE,
  type MapLevel,
  type MapDisplayMode,
  type MapVisualStyle,
  type MapSymbolPreset,
} from '@mvp-vue/schema'
import EditorNumberInput from '../../EditorNumberInput.vue'
import ColorField from '../../ColorField.vue'
import { PROP_LABEL, PROP_HINT, PROP_INPUT, PROP_NUMBER_WRAP, PROP_NUMBER_INNER } from '../../propertyPanel/shared'
import type { ComponentPropertyFieldsProps } from '../types'

const props = defineProps<ComponentPropertyFieldsProps>()

const SYMBOL_LABELS: Record<MapSymbolPreset, string> = {
  pin: '图钉', circle: '圆点', star: '星星', diamond: '菱形',
  triangle: '三角', arrow: '箭头', rect: '方块', roundRect: '圆角方块',
}
</script>

<template>
  <label class="block">
    <span :class="PROP_LABEL">标题</span>
    <input :class="PROP_INPUT" :value="(comp.props.title as string) ?? ''"
      @change="props.updateProps({ title: ($event.target as HTMLInputElement).value })" />
  </label>
  <label class="block">
    <span :class="PROP_LABEL">地图层级</span>
    <select class="editor-select w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
      :value="comp.props.mapLevel === 'province' ? 'province' : 'country'"
      @change="props.updateProps({ mapLevel: ($event.target as HTMLSelectElement).value as MapLevel })">
      <option value="country">全国（显示省）</option>
      <option value="province">省级（显示市）</option>
    </select>
  </label>
  <label v-if="(comp.props.mapLevel === 'province' ? 'province' : 'country') === 'province'" class="block">
    <span :class="PROP_LABEL">省份</span>
    <select class="editor-select w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
      :value="String(typeof comp.props.mapProvinceAdcode === 'number' ? comp.props.mapProvinceAdcode : Number(comp.props.mapProvinceAdcode) || DEFAULT_MAP_PROVINCE_ADCODE)"
      @change="props.updateProps({ mapProvinceAdcode: Number(($event.target as HTMLSelectElement).value) })">
      <option v-for="p in MAP_PROVINCE_OPTIONS" :key="p.adcode" :value="p.adcode">{{ p.name }}</option>
    </select>
  </label>
  <label class="block">
    <span :class="PROP_LABEL">展示模式</span>
    <select class="editor-select w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
      :value="comp.props.mapDisplayMode === 'symbol' ? 'symbol' : 'fill'"
      @change="props.updateProps({ mapDisplayMode: ($event.target as HTMLSelectElement).value as MapDisplayMode })">
      <option value="fill">区域填色</option>
      <option value="symbol">图标散点（颜色表示数值）</option>
    </select>
  </label>
  <label class="block">
    <span :class="PROP_LABEL">视觉效果</span>
    <select class="editor-select w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
      :value="(['vivid','dashboard','colorful'].includes(comp.props.mapVisualStyle as string) ? comp.props.mapVisualStyle : 'default') as string"
      @change="props.updateProps({ mapVisualStyle: ($event.target as HTMLSelectElement).value as MapVisualStyle })">
      <option v-for="o in MAP_VISUAL_STYLE_OPTIONS" :key="o.id" :value="o.id">{{ o.label }}</option>
    </select>
  </label>
  <p :class="PROP_HINT">
    {{ (['vivid','dashboard','colorful'].includes(comp.props.mapVisualStyle as string) ? comp.props.mapVisualStyle : 'default') === 'colorful'
      ? '多彩渐变使用蓝→青→绿→黄→橙→红六段色阶映射数值；此时低/高值双色不生效，建议开启「显示数据筛选条」查看图例。'
      : '视觉效果与展示模式可组合；仅调整边界、标签与配色对比，不替换数据源。自定义低/高值颜色后仍保留您的配色。' }}
  </p>

  <template v-if="(comp.props.mapDisplayMode === 'symbol' ? 'symbol' : 'fill') === 'symbol'">
    <label class="block">
      <span :class="PROP_LABEL">图标形状</span>
      <select class="editor-select w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
        :value="MAP_SYMBOL_PRESETS.includes(comp.props.mapSymbol as MapSymbolPreset) ? (comp.props.mapSymbol as string) : 'pin'"
        @change="props.updateProps({ mapSymbol: ($event.target as HTMLSelectElement).value as MapSymbolPreset })">
        <option v-for="s in MAP_SYMBOL_PRESETS" :key="s" :value="s">{{ SYMBOL_LABELS[s] }}</option>
      </select>
    </label>
    <label class="block">
      <span :class="PROP_LABEL">图标大小</span>
      <EditorNumberInput :min="6" :max="48" :class="PROP_NUMBER_WRAP" :input-class="PROP_NUMBER_INNER"
        :model-value="(comp.props.mapSymbolSize as number) ?? 14"
        @update:model-value="props.updateProps({ mapSymbolSize: Number($event) })" />
    </label>
    <label class="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" class="rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-400/40"
        :checked="comp.props.symbolSizeByValue === true"
        @change="props.updateProps({ symbolSizeByValue: ($event.target as HTMLInputElement).checked })" />
      <span :class="PROP_LABEL">图标大小随数值变化</span>
    </label>
    <div v-if="comp.props.symbolSizeByValue === true" class="flex gap-2">
      <label class="block flex-1">
        <span :class="PROP_LABEL">最小</span>
        <EditorNumberInput :min="4" :max="48" :class="PROP_NUMBER_WRAP" :input-class="PROP_NUMBER_INNER"
          :model-value="(comp.props.symbolSizeMin as number) ?? 10"
          @update:model-value="props.updateProps({ symbolSizeMin: Number($event) })" />
      </label>
      <label class="block flex-1">
        <span :class="PROP_LABEL">最大</span>
        <EditorNumberInput :min="4" :max="64" :class="PROP_NUMBER_WRAP" :input-class="PROP_NUMBER_INNER"
          :model-value="(comp.props.symbolSizeMax as number) ?? 28"
          @update:model-value="props.updateProps({ symbolSizeMax: Number($event) })" />
      </label>
    </div>
    <ColorField label="底图区域色"
      :value="(comp.props.mapBaseAreaColor as string) ?? '#1e293b'"
      @change="(v: string) => props.updateProps({ mapBaseAreaColor: v })" />
  </template>

  <p class="text-[10px] text-slate-500 leading-snug">
    {{ comp.props.mapLevel === 'province' ? '数据 name 请用地级市名称，如「宝鸡市」「西安市」。' : '数据 name 请用省级名称，如「陕西省」「广东省」。' }}
    {{ (comp.props.mapDisplayMode === 'symbol' ? 'symbol' : 'fill') === 'symbol' ? ' 图标模式在地区中心落点，颜色由数值映射。' : '' }}
  </p>
  <label class="block">
    <span :class="PROP_LABEL">地区字段</span>
    <input :class="PROP_INPUT" placeholder="自动检测 (name/province...)" :value="(comp.props.nameField as string) ?? ''"
      @change="props.updateProps({ nameField: ($event.target as HTMLInputElement).value || undefined })" />
  </label>
  <label class="block">
    <span :class="PROP_LABEL">数值字段</span>
    <input :class="PROP_INPUT" placeholder="自动检测 (value/count...)" :value="(comp.props.valueField as string) ?? ''"
      @change="props.updateProps({ valueField: ($event.target as HTMLInputElement).value || undefined })" />
  </label>
  <label class="flex items-center gap-2 cursor-pointer">
    <input type="checkbox" class="rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-400/40"
      :checked="comp.props.showValueLabel !== false"
      @change="props.updateProps({ showValueLabel: ($event.target as HTMLInputElement).checked })" />
    <span :class="PROP_LABEL">在地图上显示数值</span>
  </label>
  <label class="flex items-center gap-2 cursor-pointer">
    <input type="checkbox" class="rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-400/40"
      :checked="comp.props.showVisualMap === true"
      @change="props.updateProps({ showVisualMap: ($event.target as HTMLInputElement).checked })" />
    <span :class="PROP_LABEL">显示数据筛选条</span>
  </label>
  <label class="block">
    <span :class="PROP_LABEL">文字大小</span>
    <EditorNumberInput :min="8" :max="48" :class="PROP_NUMBER_WRAP" :input-class="PROP_NUMBER_INNER"
      :model-value="(comp.props.textFontSize as number) ?? DEFAULT_CHART_TEXT_FONT_SIZE"
      @update:model-value="props.updateProps({ textFontSize: Number($event) })" />
  </label>
  <ColorField label="文字颜色"
    :value="(comp.props.textColor as string) ?? DEFAULT_CHART_TEXT_COLOR"
    @change="(v: string) => props.updateProps({ textColor: v })" />
  <ColorField label="低值颜色"
    :value="(comp.props.colorLow as string) ?? '#1e293b'"
    @change="(v: string) => props.updateProps({ colorLow: v })" />
  <ColorField label="高值颜色"
    :value="(comp.props.colorHigh as string) ?? '#818cf8'"
    @change="(v: string) => props.updateProps({ colorHigh: v })" />
</template>
