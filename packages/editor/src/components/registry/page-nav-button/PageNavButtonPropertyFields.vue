<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { PAGE_NAV_ICON_PRESETS, DEFAULT_PAGE_NAV_BUTTON_COLORS } from '@mvp-vue/schema'
import { listPages, type PageListItem } from '../../../api'
import EditorNumberInput from '../../EditorNumberInput.vue'
import ColorField from '../../ColorField.vue'
import { PROP_LABEL, PROP_INPUT, PROP_NUMBER_WRAP, PROP_NUMBER_INNER, PAGE_NAV_ICON_LABELS } from '../../propertyPanel/shared'
import type { ComponentPropertyFieldsProps } from '../types'

const props = defineProps<ComponentPropertyFieldsProps>()

const pageList = ref<PageListItem[]>([])

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
  <p :class="[PROP_LABEL, 'pt-1']">按钮颜色</p>
  <ColorField
    label="文字 / 图标"
    :value="(comp.props.textColor as string) ?? DEFAULT_PAGE_NAV_BUTTON_COLORS.textColor"
    @change="(v: string) => props.updateProps({ textColor: v })"
  />
  <ColorField
    label="边框"
    :value="(comp.props.borderColor as string) ?? DEFAULT_PAGE_NAV_BUTTON_COLORS.borderColor"
    @change="(v: string) => props.updateProps({ borderColor: v })"
  />
  <ColorField
    label="背景渐变（亮）"
    :value="(comp.props.bgColorFrom as string) ?? DEFAULT_PAGE_NAV_BUTTON_COLORS.bgColorFrom"
    @change="(v: string) => props.updateProps({ bgColorFrom: v })"
  />
  <ColorField
    label="背景渐变（暗）"
    :value="(comp.props.bgColorTo as string) ?? DEFAULT_PAGE_NAV_BUTTON_COLORS.bgColorTo"
    @change="(v: string) => props.updateProps({ bgColorTo: v })"
  />
  <ColorField
    label="外发光"
    :value="(comp.props.glowColor as string) ?? DEFAULT_PAGE_NAV_BUTTON_COLORS.glowColor"
    @change="(v: string) => props.updateProps({ glowColor: v })"
  />
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
    <span :class="PROP_LABEL">内置图标</span>
    <select
      class="editor-select w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 outline-none transition-colors"
      :value="(comp.props.iconPreset as string) ?? 'arrow-right'"
      @change="props.updateProps({ iconPreset: ($event.target as HTMLSelectElement).value })"
    >
      <option v-for="key in PAGE_NAV_ICON_PRESETS" :key="key" :value="key">{{ PAGE_NAV_ICON_LABELS[key] }}</option>
    </select>
  </label>
  <label class="block">
    <span :class="PROP_LABEL">自定义图标 URL</span>
    <input
      :class="PROP_INPUT"
      placeholder="留空则使用内置图标"
      :value="(comp.props.iconUrl as string) ?? ''"
      @change="props.updateProps({ iconUrl: ($event.target as HTMLInputElement).value })"
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
</template>
