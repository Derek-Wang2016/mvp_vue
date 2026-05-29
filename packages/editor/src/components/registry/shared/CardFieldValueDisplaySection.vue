<script setup lang="ts">
import type { CardFieldConfig, CardFieldValueDisplay } from '@mvp-vue/schema'
import {
  DEFAULT_CARD_QR_BG_COLOR,
  DEFAULT_CARD_QR_COLOR,
  DEFAULT_CARD_QR_MARGIN,
  DEFAULT_CARD_QR_SIZE_PX,
} from '@mvp-vue/schema'
import ColorSwatch from '../../ColorSwatch.vue'
import EditorNumberInput from '../../EditorNumberInput.vue'
import {
  PROP_INPUT,
  PROP_NUMBER_INNER_COMPACT,
  PROP_NUMBER_WRAP_COMPACT,
  PROP_SELECT_COMPACT,
} from '../../propertyPanel/shared'

const props = defineProps<{
  field: CardFieldConfig
}>()

const emit = defineEmits<{
  update: [patch: Partial<CardFieldConfig>]
}>()

function patch(p: Partial<CardFieldConfig>) {
  emit('update', p)
}

function onValueDisplayChange(raw: string) {
  const valueDisplay = (raw as CardFieldValueDisplay) || undefined
  if (valueDisplay === 'qrcode') {
    patch({
      valueDisplay,
      abbrevDictEnabled: undefined,
      tagSplitEnabled: undefined,
      tagSeparator: undefined,
      tagBgColor: undefined,
      tagLayout: undefined,
    })
    return
  }
  patch({ valueDisplay })
}
</script>

<template>
  <label class="block">
    <span class="text-[11px] font-medium text-slate-400 block">值显示方式</span>
    <select
      :class="[PROP_SELECT_COMPACT, 'focus:ring-1 focus:ring-indigo-400/30']"
      :value="field.valueDisplay ?? 'text'"
      @change="onValueDisplayChange(($event.target as HTMLSelectElement).value)"
    >
      <option value="text">原始值</option>
      <option value="icon">图标</option>
      <option value="qrcode">二维码</option>
    </select>
  </label>

  <template v-if="field.valueDisplay === 'qrcode'">
    <p class="text-[9px] text-slate-500 -mt-0.5 mb-1">
      将字段值（经日期格式转换后）编码为二维码；空值不渲染
    </p>

    <label class="block mb-1">
      <span class="text-[11px] font-medium text-slate-400 block">边长 (px)</span>
      <EditorNumberInput
        :class="PROP_NUMBER_WRAP_COMPACT"
        :input-class="PROP_NUMBER_INNER_COMPACT"
        :model-value="field.qrSizePx ?? DEFAULT_CARD_QR_SIZE_PX"
        :min="24"
        :max="512"
        :step="4"
        @update:model-value="(v) => patch({ qrSizePx: v === '' ? undefined : Number(v) })"
      />
    </label>

    <label class="block mb-1">
      <span class="text-[11px] font-medium text-slate-400 block">留白 (模块)</span>
      <EditorNumberInput
        :class="PROP_NUMBER_WRAP_COMPACT"
        :input-class="PROP_NUMBER_INNER_COMPACT"
        :model-value="field.qrMargin ?? DEFAULT_CARD_QR_MARGIN"
        :min="0"
        :max="8"
        :step="1"
        @update:model-value="(v) => patch({ qrMargin: v === '' ? undefined : Number(v) })"
      />
    </label>

    <div class="grid grid-cols-2 gap-2 mb-1">
      <div>
        <span class="text-[11px] font-medium text-slate-400 block">前景色</span>
        <div class="flex gap-1 mt-0.5">
          <ColorSwatch
            class="w-8 h-8 shrink-0 border border-white/10"
            :value="field.qrColor ?? DEFAULT_CARD_QR_COLOR"
            @change="(qrColor) => patch({ qrColor })"
          />
          <input
            :class="[PROP_INPUT, 'min-w-0 flex-1 font-mono text-xs']"
            :value="field.qrColor ?? ''"
            :placeholder="DEFAULT_CARD_QR_COLOR"
            @input="patch({ qrColor: ($event.target as HTMLInputElement).value || undefined })"
          />
        </div>
      </div>
      <div>
        <span class="text-[11px] font-medium text-slate-400 block">背景色</span>
        <div class="flex gap-1 mt-0.5">
          <ColorSwatch
            class="w-8 h-8 shrink-0 border border-white/10"
            :value="field.qrBgColor ?? DEFAULT_CARD_QR_BG_COLOR"
            @change="(qrBgColor) => patch({ qrBgColor })"
          />
          <input
            :class="[PROP_INPUT, 'min-w-0 flex-1 font-mono text-xs']"
            :value="field.qrBgColor ?? ''"
            :placeholder="DEFAULT_CARD_QR_BG_COLOR"
            @input="patch({ qrBgColor: ($event.target as HTMLInputElement).value || undefined })"
          />
        </div>
      </div>
    </div>
  </template>
</template>
