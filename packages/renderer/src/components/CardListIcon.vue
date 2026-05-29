<script setup lang="ts">
import { computed } from 'vue'
import type { CustomIconRecord, IconDictEntry } from '@mvp-vue/schema'
import { savedIconsToMap, resolveInlineSvgColorMode, svgToMaskDataUrl } from '@mvp-vue/schema'
import { Icon } from '@iconify/vue'

const props = defineProps<{
  entry: IconDictEntry
  savedIcons?: CustomIconRecord[]
  size?: string | number
  color?: string
}>()

const savedMap = computed(() => savedIconsToMap(props.savedIcons))

const rawInlineSvg = computed(() => {
  if (props.entry.iconType === 'custom' && props.entry.iconSvg) return props.entry.iconSvg
  if (props.entry.iconType === 'saved' && props.entry.savedIconId != null) {
    return savedMap.value.get(props.entry.savedIconId)?.svgContent ?? ''
  }
  return ''
})

const colorMode = computed(() => resolveInlineSvgColorMode(rawInlineSvg.value, props.color))

const sizeCss = computed(() => {
  const s = props.size
  if (s == null) return { width: '1em', height: '1em' }
  if (typeof s === 'number') return { width: `${s}px`, height: `${s}px` }
  return { width: s, height: s }
})

const maskStyle = computed(() => {
  if (colorMode.value !== 'mask' || !props.color) return {}
  return {
    ...sizeCss.value,
    backgroundColor: props.color,
    WebkitMaskImage: svgToMaskDataUrl(rawInlineSvg.value),
    maskImage: svgToMaskDataUrl(rawInlineSvg.value),
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
  <span
    v-if="rawInlineSvg && colorMode === 'mask'"
    class="mvp-icon-svg-mask inline-block shrink-0"
    :style="maskStyle"
    role="img"
    aria-hidden="true"
  />
  <span
    v-else-if="rawInlineSvg"
    class="inline-flex shrink-0 items-center justify-center [&>svg]:h-full [&>svg]:w-full"
    :style="sizeCss"
    v-html="rawInlineSvg"
  />
  <Icon
    v-else-if="entry.iconName"
    :icon="entry.iconName"
    :width="size ?? '1em'"
    :height="size ?? '1em'"
    :color="color"
    style="display: block"
  />
</template>
