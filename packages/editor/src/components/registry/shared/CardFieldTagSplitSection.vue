<script setup lang="ts">
import type { CardFieldConfig } from '@mvp-vue/schema'
import {
  CARD_TAG_BG_COLOR_DICT_VALUE,
  DEFAULT_CARD_TAG_SEPARATOR,
} from '@mvp-vue/schema'
import { PROP_INPUT, PROP_SELECT_COMPACT } from '../../propertyPanel/shared'

defineProps<{
  field: CardFieldConfig
  /** 为 false 时不展示整块（如值显示方式为二维码） */
  show?: boolean
}>()

const emit = defineEmits<{
  update: [patch: Partial<CardFieldConfig>]
}>()

function patch(p: Partial<CardFieldConfig>) {
  emit('update', p)
}

function onToggle(checked: boolean, field: CardFieldConfig) {
  if (!checked) {
    patch({
      tagSplitEnabled: undefined,
      tagSeparator: undefined,
      tagBgColor: undefined,
      tagLayout: undefined,
    })
    return
  }
  patch({
    tagSplitEnabled: true,
    tagSeparator: field.tagSeparator ?? DEFAULT_CARD_TAG_SEPARATOR,
    tagBgColor:
      field.tagBgColor === 'DICT' || !field.tagBgColor ? CARD_TAG_BG_COLOR_DICT_VALUE : field.tagBgColor,
    tagLayout: field.tagLayout ?? 'inline',
  })
}
</script>

<template>
  <template v-if="show !== false">
    <label class="flex items-center gap-2 mb-1 cursor-pointer">
      <input
        type="checkbox"
        class="rounded border-white/20"
        :checked="field.tagSplitEnabled === true"
        @change="onToggle(($event.target as HTMLInputElement).checked, field)"
      />
      <span class="text-[11px] font-medium text-slate-400">Tag 切分展示</span>
    </label>

    <template v-if="field.tagSplitEnabled">
      <label class="block mb-1">
        <span class="text-[11px] font-medium text-slate-400 block">切分字符</span>
        <input
          :class="PROP_INPUT"
          :placeholder="DEFAULT_CARD_TAG_SEPARATOR"
          :value="field.tagSeparator ?? DEFAULT_CARD_TAG_SEPARATOR"
          @input="patch({ tagSeparator: ($event.target as HTMLInputElement).value || DEFAULT_CARD_TAG_SEPARATOR })"
        />
      </label>

      <label class="block mb-1">
        <span class="text-[11px] font-medium text-slate-400 block">Tag 排列</span>
        <select
          :class="[PROP_SELECT_COMPACT, 'focus:ring-1 focus:ring-indigo-400/30']"
          :value="field.tagLayout ?? 'inline'"
          @change="patch({ tagLayout: (($event.target as HTMLSelectElement).value as 'inline' | 'stack') || undefined })"
        >
          <option value="inline">一行多项</option>
          <option value="stack">一行一项</option>
        </select>
        <p class="text-[9px] text-slate-500 mt-0.5">
          一行一项时每个 Tag 独占一行，底色横向铺满值区域
        </p>
      </label>

      <label class="block">
        <span class="text-[11px] font-medium text-slate-400 block">Tag 底色</span>
        <input
          :class="PROP_INPUT"
          :placeholder="CARD_TAG_BG_COLOR_DICT_VALUE"
          :value="field.tagBgColor === 'DICT' || !field.tagBgColor ? CARD_TAG_BG_COLOR_DICT_VALUE : field.tagBgColor"
          @input="patch({ tagBgColor: ($event.target as HTMLInputElement).value.trim() || CARD_TAG_BG_COLOR_DICT_VALUE })"
        />
        <p class="text-[9px] text-slate-500 mt-0.5">
          {{ CARD_TAG_BG_COLOR_DICT_VALUE }}：每个 tag 用切分后的文字查颜色字典；或填 #334155 等固定色
        </p>
      </label>
    </template>
  </template>
</template>
