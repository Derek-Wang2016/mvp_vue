<script setup lang="ts">
import { computed } from 'vue'
import { getMapProvinceName, getMapVisualStyleLabel, resolveMapConfig } from '@mvp-vue/schema'
import type { CanvasPreviewProps } from '../types'

const props = defineProps<CanvasPreviewProps>()

const title = computed(() => (props.comp.props.title as string) ?? '地图')
const { level, adcode } = resolveMapConfig(props.comp.props)

const modeLabel = computed(() => props.comp.props.mapDisplayMode === 'symbol' ? '图标' : '填色')
const visualLabel = computed(() => getMapVisualStyleLabel(
  props.comp.props.mapVisualStyle as 'default' | 'vivid' | 'dashboard' | 'colorful' | undefined,
))

const subtitle = computed(() =>
  level === 'country'
    ? `全国 · 省级 · ${modeLabel.value} · ${visualLabel.value}`
    : `${getMapProvinceName(adcode) ?? '省级'} · 市 · ${modeLabel.value} · ${visualLabel.value}`
)
</script>

<template>
  <div class="w-full h-full rounded border border-white/5 bg-[#0f172a]/80 flex flex-col items-center justify-center gap-2 text-slate-400">
    <span class="text-3xl opacity-80" aria-hidden>🗺</span>
    <span class="text-xs text-slate-300">{{ title }}</span>
    <span class="text-[10px] text-slate-500">{{ subtitle }} · 预览</span>
  </div>
</template>
