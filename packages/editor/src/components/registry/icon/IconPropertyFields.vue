<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  iconEntryPickerLabel,
  iconPickerResultToProps,
  iconPropsToDictEntry,
  savedIconsToMap,
  type IconDictEntry,
} from '@mvp-vue/schema'
import { useEditorStore } from '../../../stores/editorStore'
import { storeToRefs } from 'pinia'
import ColorField from '../../ColorField.vue'
import EditorNumberInput from '../../EditorNumberInput.vue'
import IconPickerModal from '../../IconPickerModal.vue'
import IconDictEntryPreview from '../../IconDictEntryPreview.vue'
import { FONT_FAMILY_OPTIONS, FONT_FAMILY_SELECT_CLASS } from '../../propertyPanel/editorFontOptions'
import { PROP_LABEL, PROP_INPUT, PROP_HINT, PROP_NUMBER_WRAP, PROP_NUMBER_INNER } from '../../propertyPanel/shared'
import type { ComponentPropertyFieldsProps } from '../types'

const props = defineProps<ComponentPropertyFieldsProps>()
const store = useEditorStore()
const { savedIcons } = storeToRefs(store)

const pickerOpen = ref(false)
const iconSearch = ref('')
const pickerTab = ref<'preset' | 'custom'>('preset')
const customSvgInput = ref('')

const savedIconMap = computed(() => savedIconsToMap(savedIcons.value))

function currentEntry(): IconDictEntry {
  return iconPropsToDictEntry(props.comp.props)
}

function openPicker() {
  const entry = currentEntry()
  iconSearch.value = ''
  if (entry.iconType === 'custom') {
    pickerTab.value = 'custom'
    customSvgInput.value = entry.iconSvg ?? ''
  } else if (entry.iconType === 'saved') {
    pickerTab.value = 'custom'
    customSvgInput.value = ''
  } else {
    pickerTab.value = 'preset'
    customSvgInput.value = ''
  }
  pickerOpen.value = true
}

function onPickerConfirm(entry: IconDictEntry) {
  props.updateProps(iconPickerResultToProps(entry))
  pickerOpen.value = false
}
</script>

<template>
  <div class="flex items-center gap-2 mb-2">
    <button
      type="button"
      class="flex-1 rounded border border-white/15 bg-white/[0.08] px-2 py-1.5 text-[11px] text-slate-300 hover:bg-white/[0.12] transition-colors text-left truncate"
      @click="openPicker"
    >
      {{ iconEntryPickerLabel(currentEntry(), currentEntry().iconType === 'saved' && currentEntry().savedIconId != null ? savedIconMap.get(currentEntry().savedIconId!)?.name : undefined) }}
    </button>
    <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-white/10 bg-white/5">
      <IconDictEntryPreview
        :entry="currentEntry()"
        :saved-icons="savedIcons"
        :size="22"
        :color="(comp.props.color as string) ?? '#cbd5e1'"
      />
    </div>
  </div>
  <p :class="PROP_HINT">支持内置 Tabler、我的图标库与内联 SVG。图标颜色对单色 SVG 生效（保留镂空细节）；含多种填色的彩色 SVG 将保持原色。</p>

  <ColorField
    label="图标颜色"
    :value="(comp.props.color as string) ?? '#cbd5e1'"
    @change="(v: string) => props.updateProps({ color: v })"
  />

  <label class="block">
    <span :class="PROP_LABEL">填充比例 (%)</span>
    <EditorNumberInput
      :min="20"
      :max="100"
      :class="PROP_NUMBER_WRAP"
      :input-class="PROP_NUMBER_INNER"
      :model-value="Math.round(((comp.props.iconScale as number) ?? 0.85) * 100)"
      @update:model-value="props.updateProps({ iconScale: Math.min(1, Math.max(0.2, Number($event) / 100)) })"
    />
  </label>
  <p :class="PROP_HINT">图标大小随组件外框拖拽自动缩放；比例控制图标在框内的占比。</p>

  <label class="block">
    <span :class="PROP_LABEL">不透明度</span>
    <EditorNumberInput
      :min="0"
      :max="1"
      :step="0.05"
      :class="PROP_NUMBER_WRAP"
      :input-class="PROP_NUMBER_INNER"
      :model-value="(comp.props.opacity as number) ?? 1"
      @update:model-value="props.updateProps({ opacity: Number($event) })"
    />
  </label>

  <div class="flex gap-2">
    <label class="block flex-1">
      <span :class="PROP_LABEL">水平对齐</span>
      <select
        :class="FONT_FAMILY_SELECT_CLASS"
        :value="(comp.props.align as string) ?? 'center'"
        @change="props.updateProps({ align: ($event.target as HTMLSelectElement).value })"
      >
        <option value="left">左</option>
        <option value="center">中</option>
        <option value="right">右</option>
      </select>
    </label>
    <label class="block flex-1">
      <span :class="PROP_LABEL">垂直对齐</span>
      <select
        :class="FONT_FAMILY_SELECT_CLASS"
        :value="(comp.props.valign as string) ?? 'center'"
        @change="props.updateProps({ valign: ($event.target as HTMLSelectElement).value })"
      >
        <option value="top">上</option>
        <option value="center">中</option>
        <option value="bottom">下</option>
      </select>
    </label>
  </div>

  <label class="block pt-1 border-t border-white/10">
    <span :class="PROP_LABEL">说明文字（可选）</span>
    <input
      :class="PROP_INPUT"
      placeholder="显示在图标下方"
      :value="(comp.props.caption as string) ?? ''"
      @change="props.updateProps({ caption: ($event.target as HTMLInputElement).value })"
    />
  </label>

  <template v-if="(comp.props.caption as string)?.trim()">
    <label class="block">
      <span :class="PROP_LABEL">说明字体</span>
      <select
        :class="FONT_FAMILY_SELECT_CLASS"
        :value="(comp.props.fontFamily as string) ?? 'sans-serif'"
        @change="props.updateProps({ fontFamily: ($event.target as HTMLSelectElement).value })"
      >
        <option v-for="opt in FONT_FAMILY_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
    </label>
    <p :class="PROP_HINT">说明文字字号随组件高度自动调整。</p>
    <ColorField
      label="说明颜色"
      :value="(comp.props.captionColor as string) || (comp.props.color as string) || '#cbd5e1'"
      @change="(v: string) => props.updateProps({ captionColor: v })"
    />
  </template>

  <IconPickerModal
    v-if="pickerOpen"
    :entry="currentEntry()"
    :search="iconSearch"
    :picker-tab="pickerTab"
    :custom-svg-input="customSvgInput"
    @update:search="iconSearch = $event"
    @update:picker-tab="pickerTab = $event"
    @update:custom-svg-input="customSvgInput = $event"
    @confirm="onPickerConfirm"
    @cancel="pickerOpen = false"
  />
</template>
