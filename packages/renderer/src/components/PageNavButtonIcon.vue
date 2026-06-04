<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import type { CustomIconRecord, PageNavIconDisplay } from '@mvp-vue/schema'
import { savedIconsToMap, resolveInlineSvgColorMode, svgToMaskDataUrl } from '@mvp-vue/schema'

const props = defineProps<{
  display: PageNavIconDisplay
  size: number
  color: string
  savedIcons?: CustomIconRecord[]
}>()

const savedMap = computed(() => savedIconsToMap(props.savedIcons))

const rawSvg = computed(() => {
  if (props.display.kind !== 'dict') return ''
  const e = props.display.entry
  if (e.iconType === 'custom' && e.iconSvg) return e.iconSvg
  if (e.iconType === 'saved' && e.savedIconId != null) {
    return savedMap.value.get(e.savedIconId)?.svgContent ?? ''
  }
  return ''
})

const colorMode = computed(() => resolveInlineSvgColorMode(rawSvg.value, props.color))
const px = computed(() => `${props.size}px`)

const maskStyle = computed(() => {
  if (colorMode.value !== 'mask' || !props.color) return {}
  return {
    width: px.value,
    height: px.value,
    backgroundColor: props.color,
    WebkitMaskImage: svgToMaskDataUrl(rawSvg.value),
    maskImage: svgToMaskDataUrl(rawSvg.value),
    WebkitMaskSize: 'contain',
    maskSize: 'contain' as const,
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat' as const,
    WebkitMaskPosition: 'center',
    maskPosition: 'center' as const,
  }
})

const preset = computed(() => (props.display.kind === 'builtin' ? props.display.preset : null))
</script>

<template>
  <img
    v-if="display.kind === 'url'"
    :src="display.url"
    alt=""
    class="relative z-[1] object-contain shrink-0"
    :style="{ width: px, height: px }"
    draggable="false"
  />
  <Icon
    v-else-if="display.kind === 'dict' && display.entry.iconType === 'preset' && display.entry.iconName"
    class="relative z-[1] shrink-0 opacity-90"
    :icon="display.entry.iconName"
    :width="size"
    :height="size"
    :color="color"
  />
  <span
    v-else-if="display.kind === 'dict' && rawSvg && colorMode === 'mask'"
    class="mvp-icon-svg-mask relative z-[1] inline-block shrink-0 opacity-90"
    :style="maskStyle"
    aria-hidden="true"
  />
  <span
    v-else-if="display.kind === 'dict' && rawSvg"
    class="relative z-[1] inline-flex shrink-0 items-center justify-center opacity-90 [&>svg]:max-h-full [&>svg]:max-w-full"
    :style="{ width: px, height: px }"
    v-html="rawSvg"
  />
  <span
    v-else-if="preset"
    class="relative z-[1] flex shrink-0 items-center justify-center opacity-90"
  >
    <svg
      v-if="preset === 'arrow-right'"
      :width="size"
      :height="size"
      viewBox="0 0 24 24"
      fill="none"
      :stroke="color"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
    <svg
      v-else-if="preset === 'home'"
      :width="size"
      :height="size"
      viewBox="0 0 24 24"
      fill="none"
      :stroke="color"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </svg>
    <svg
      v-else-if="preset === 'layout-grid'"
      :width="size"
      :height="size"
      viewBox="0 0 24 24"
      fill="none"
      :stroke="color"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
    <svg
      v-else-if="preset === 'bar-chart'"
      :width="size"
      :height="size"
      viewBox="0 0 24 24"
      fill="none"
      :stroke="color"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M4 20V10M10 20V4M16 20v-6M22 20V8" />
    </svg>
    <svg
      v-else-if="preset === 'external-link'"
      :width="size"
      :height="size"
      viewBox="0 0 24 24"
      fill="none"
      :stroke="color"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  </span>
</template>
