<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import {
  PAGE_NAV_ICON_PRESETS,
  DEFAULT_PAGE_NAV_BUTTON_COLORS,
  DEFAULT_PAGE_NAV_ICON_GAP,
  DEFAULT_PAGE_NAV_ICON_SIZE,
  PAGE_NAV_ICON_POSITION_OPTIONS,
  pageNavPropsToIconEntry,
  pageNavIconPickerToProps,
  iconEntryPickerLabel,
  savedIconsToMap,
  resolvePageNavButtonAppearance,
  type BgGradient,
  type IconDictEntry,
} from '@mvp-vue/schema'
import { listPages, type PageListItem } from '../../../api'
import { useEditorStore } from '../../../stores/editorStore'
import EditorNumberInput from '../../EditorNumberInput.vue'
import ColorField from '../../ColorField.vue'
import IconPickerModal from '../../IconPickerModal.vue'
import IconDictEntryPreview from '../../IconDictEntryPreview.vue'
import { PROP_LABEL, PROP_INPUT, PROP_HINT, PROP_NUMBER_WRAP, PROP_NUMBER_INNER, PAGE_NAV_ICON_LABELS } from '../../propertyPanel/shared'
import type { ComponentPropertyFieldsProps } from '../types'

const props = defineProps<ComponentPropertyFieldsProps>()
const store = useEditorStore()
const { savedIcons } = storeToRefs(store)

const pageList = ref<PageListItem[]>([])
const pickerOpen = ref(false)
const iconSearch = ref('')
const pickerTab = ref<'preset' | 'custom'>('preset')
const customSvgInput = ref('')

const savedIconMap = computed(() => savedIconsToMap(savedIcons.value))

function currentIconEntry(): IconDictEntry | null {
  return pageNavPropsToIconEntry(props.comp.props)
}

function iconPickerLabel(): string {
  const entry = currentIconEntry()
  if (entry) {
    const savedName =
      entry.iconType === 'saved' && entry.savedIconId != null
        ? savedIconMap.value.get(entry.savedIconId)?.name
        : undefined
    return iconEntryPickerLabel(entry, savedName)
  }
  const preset = (props.comp.props.iconPreset as string) ?? 'arrow-right'
  const url = String(props.comp.props.iconUrl ?? '').trim()
  if (url) return `图片 URL`
  return PAGE_NAV_ICON_LABELS[preset as keyof typeof PAGE_NAV_ICON_LABELS] ?? preset
}

function openIconPicker() {
  const entry = currentIconEntry()
  iconSearch.value = ''
  if (entry?.iconType === 'custom') {
    pickerTab.value = 'custom'
    customSvgInput.value = entry.iconSvg ?? ''
  } else if (entry?.iconType === 'saved') {
    pickerTab.value = 'custom'
    customSvgInput.value = ''
  } else {
    pickerTab.value = 'preset'
    customSvgInput.value = ''
  }
  pickerOpen.value = true
}

function onIconPickerConfirm(entry: IconDictEntry) {
  props.updateProps(pageNavIconPickerToProps(entry))
  pickerOpen.value = false
}

function useBuiltinPreset() {
  props.updateProps({
    iconType: undefined,
    iconName: undefined,
    iconSvg: undefined,
    savedIconId: undefined,
  })
}

const previewIconEntry = computed((): IconDictEntry => {
  const dict = currentIconEntry()
  if (dict) return dict
  return { id: '', key: '', iconType: 'preset', iconName: 'tabler:arrow-right' }
})

const previewIconColor = computed(() => {
  const c = String(props.comp.props.iconColor ?? '').trim()
  return c || ((props.comp.props.textColor as string) ?? DEFAULT_PAGE_NAV_BUTTON_COLORS.textColor)
})

const appearance = () => resolvePageNavButtonAppearance(props.comp.props)

onMounted(async () => {
  try {
    pageList.value = await listPages('publish')
  } catch {
    pageList.value = []
  }
})
</script>

<template>
  <label class="block">
    <span :class="PROP_LABEL">按钮文字</span>
    <input
      :class="PROP_INPUT"
      :value="(comp.props.label as string) ?? ''"
      @change="props.updateProps({ label: ($event.target as HTMLInputElement).value })"
    />
  </label>

  <p :class="[PROP_LABEL, 'pt-1']">图标</p>
  <div class="flex items-center gap-2 mb-1">
    <button
      type="button"
      class="flex-1 rounded border border-white/15 bg-white/[0.08] px-2 py-1.5 text-[11px] text-slate-300 hover:bg-white/[0.12] transition-colors text-left truncate"
      @click="openIconPicker"
    >
      {{ iconPickerLabel() }}
    </button>
    <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-white/10 bg-white/5">
      <IconDictEntryPreview
        v-if="currentIconEntry()"
        :entry="previewIconEntry"
        :saved-icons="savedIcons"
        :size="22"
        :color="previewIconColor"
      />
      <span v-else class="text-[10px] text-slate-500">{{ PAGE_NAV_ICON_LABELS[((comp.props.iconPreset as string) ?? 'arrow-right') as keyof typeof PAGE_NAV_ICON_LABELS] }}</span>
    </div>
  </div>
  <p :class="PROP_HINT">支持 Tabler 预设、我的图标库与内联 SVG；也可使用下方内置图标或图片 URL。</p>
  <button
    v-if="currentIconEntry()"
    type="button"
    class="mb-2 text-[11px] text-indigo-300 hover:text-indigo-200"
    @click="useBuiltinPreset"
  >
    改回内置图标
  </button>

  <label class="block">
    <span :class="PROP_LABEL">内置图标</span>
    <select
      class="editor-select w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 outline-none transition-colors"
      :value="(comp.props.iconPreset as string) ?? 'arrow-right'"
      :disabled="!!currentIconEntry()"
      @change="props.updateProps({
        iconPreset: ($event.target as HTMLSelectElement).value,
        iconType: undefined,
        iconName: undefined,
        iconSvg: undefined,
        savedIconId: undefined,
      })"
    >
      <option v-for="key in PAGE_NAV_ICON_PRESETS" :key="key" :value="key">{{ PAGE_NAV_ICON_LABELS[key] }}</option>
    </select>
  </label>
  <label class="block">
    <span :class="PROP_LABEL">自定义图标 URL</span>
    <input
      :class="PROP_INPUT"
      placeholder="留空则使用上方图标"
      :value="(comp.props.iconUrl as string) ?? ''"
      :disabled="!!currentIconEntry()"
      @change="props.updateProps({
        iconUrl: ($event.target as HTMLInputElement).value,
        iconType: undefined,
        iconName: undefined,
        iconSvg: undefined,
        savedIconId: undefined,
      })"
    />
  </label>

  <label class="block">
    <span :class="PROP_LABEL">图标与文字位置</span>
    <select
      class="editor-select w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 focus:border-indigo-400/50 outline-none transition-colors"
      :value="(comp.props.iconPosition as string) ?? 'left'"
      @change="props.updateProps({ iconPosition: ($event.target as HTMLSelectElement).value })"
    >
      <option v-for="opt in PAGE_NAV_ICON_POSITION_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
  </label>

  <label class="block">
    <span :class="PROP_LABEL">图标与文字间距 (px)</span>
    <EditorNumberInput
      :min="0"
      :max="48"
      :class="PROP_NUMBER_WRAP"
      :input-class="PROP_NUMBER_INNER"
      :model-value="(comp.props.iconGap as number) ?? DEFAULT_PAGE_NAV_ICON_GAP"
      @update:model-value="props.updateProps({ iconGap: Number($event) })"
    />
  </label>

  <label class="block">
    <span :class="PROP_LABEL">图标大小 (px)</span>
    <EditorNumberInput
      :min="8"
      :max="64"
      :class="PROP_NUMBER_WRAP"
      :input-class="PROP_NUMBER_INNER"
      :model-value="(comp.props.iconSize as number) ?? DEFAULT_PAGE_NAV_ICON_SIZE"
      @update:model-value="props.updateProps({ iconSize: Number($event) })"
    />
  </label>

  <ColorField
    label="图标颜色（留空同文字）"
    :value="(comp.props.iconColor as string) || (comp.props.textColor as string) || DEFAULT_PAGE_NAV_BUTTON_COLORS.textColor"
    @change="(v: string) => {
      const text = (comp.props.textColor as string) ?? DEFAULT_PAGE_NAV_BUTTON_COLORS.textColor
      props.updateProps({ iconColor: v === text ? '' : v })
    }"
  />
  <p :class="PROP_HINT">单色 SVG 可通过 mask 着色并保留镂空；多色 SVG 保持原色。</p>

  <p :class="[PROP_LABEL, 'pt-1']">按钮颜色</p>
  <ColorField
    label="文字"
    :value="(comp.props.textColor as string) ?? DEFAULT_PAGE_NAV_BUTTON_COLORS.textColor"
    @change="(v: string) => props.updateProps({ textColor: v })"
  />
  <ColorField
    label="边框"
    :value="(comp.props.borderColor as string) ?? DEFAULT_PAGE_NAV_BUTTON_COLORS.borderColor"
    @change="(v: string) => props.updateProps({ borderColor: v })"
  />

  <label class="block">
    <span :class="PROP_LABEL">背景渐变模式</span>
    <select
      class="editor-select w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 focus:border-indigo-400/50 outline-none transition-colors"
      :value="appearance().backgroundGradient"
      @change="props.updateProps({ bgGradient: ($event.target as HTMLSelectElement).value as BgGradient })"
    >
      <option value="none">无渐变（纯色）</option>
      <option value="linear-top">线性 — 上→下</option>
      <option value="linear-left">线性 — 左→右</option>
      <option value="linear-diagonal">线性 — 对角</option>
      <option value="radial">径向</option>
    </select>
  </label>

  <ColorField
    v-if="appearance().backgroundGradient === 'none'"
    label="背景色"
    :value="appearance().backgroundColor"
    @change="(v: string) => props.updateProps({ bgColorFrom: v })"
  />
  <template v-else>
    <ColorField
      label="背景（亮）"
      :value="appearance().backgroundColor"
      @change="(v: string) => props.updateProps({ bgColorFrom: v })"
    />
    <ColorField
      label="背景（暗）"
      :value="appearance().backgroundColorTo"
      @change="(v: string) => props.updateProps({ bgColorTo: v })"
    />
  </template>
  <label class="block">
    <span :class="PROP_LABEL">字号</span>
    <EditorNumberInput
      :min="10"
      :max="48"
      :class="PROP_NUMBER_WRAP"
      :input-class="PROP_NUMBER_INNER"
      :model-value="(comp.props.fontSize as number) ?? 15"
      @update:model-value="props.updateProps({ fontSize: Number($event) })"
    />
  </label>
  <label class="block">
    <span :class="PROP_LABEL">跳转页面</span>
    <select
      class="editor-select w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 outline-none transition-colors"
      :value="comp.props.targetPageId != null ? String(comp.props.targetPageId) : ''"
      @change="(e: Event) => {
        const v = (e.target as HTMLSelectElement).value
        props.updateProps({ targetPageId: v ? Number(v) : null })
      }"
    >
      <option value="">未选择</option>
      <option v-for="p in pageList" :key="p.id" :value="p.id">{{ p.name }} (#{{ p.id }})</option>
    </select>
    <p class="text-[11px] text-slate-400 mt-1">跳转目标为发布表页面（Renderer ?id=）</p>
  </label>

  <IconPickerModal
    v-if="pickerOpen"
    :entry="previewIconEntry"
    :search="iconSearch"
    :picker-tab="pickerTab"
    :custom-svg-input="customSvgInput"
    @update:search="iconSearch = $event"
    @update:picker-tab="pickerTab = $event"
    @update:custom-svg-input="customSvgInput = $event"
    @confirm="onIconPickerConfirm"
    @cancel="pickerOpen = false"
  />
</template>
