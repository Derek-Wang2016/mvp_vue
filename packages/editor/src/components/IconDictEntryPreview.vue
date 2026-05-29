<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import type { CustomIconRecord, IconDictEntry } from '@mvp-vue/schema'
import { savedIconsToMap, resolveInlineSvgColorMode, svgToMaskDataUrl } from '@mvp-vue/schema'

const props = defineProps<{
  entry: IconDictEntry
  savedIcons?: CustomIconRecord[]
  size?: number
  color?: string
}>()

const savedMap = computed(() => savedIconsToMap(props.savedIcons))

const rawSvg = computed(() => {
  if (props.entry.iconType === 'custom' && props.entry.iconSvg) return props.entry.iconSvg
  if (props.entry.iconType === 'saved' && props.entry.savedIconId != null) {
    return savedMap.value.get(props.entry.savedIconId)?.svgContent ?? ''
  }
  return ''
})

const colorMode = computed(() => resolveInlineSvgColorMode(rawSvg.value, props.color))

const px = computed(() => `${props.size ?? 18}px`)

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
</script>

<template>
  <Icon
    v-if="entry.iconType === 'preset' && entry.iconName"
    :icon="entry.iconName"
    :width="size ?? 18"
    :height="size ?? 18"
    :color="color"
  />
  <span
    v-else-if="rawSvg && colorMode === 'mask'"
    class="mvp-icon-svg-mask inline-block shrink-0"
    :style="maskStyle"
    aria-hidden="true"
  />
  <span
    v-else-if="rawSvg"
    class="inline-flex items-center justify-center [&>svg]:max-h-full [&>svg]:max-w-full"
    :style="{ width: px, height: px }"
    v-html="rawSvg"
  />
  <span v-else class="text-[9px] text-slate-500">—</span>
</template>
