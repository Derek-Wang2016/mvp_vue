<script setup lang="ts">
import {
  WATERMARK_FONT_SIZE,
  WATERMARK_FONT_WEIGHT,
  WATERMARK_OPACITY,
  WATERMARK_ROTATE_DEG,
  WATERMARK_TILE_HEIGHT,
  WATERMARK_TILE_WIDTH,
} from '../watermarkConfig'

const props = defineProps<{
  text: string
  width: number
  height: number
}>()

function escapeSvgText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildWatermarkPattern(text: string): string {
  const label = escapeSvgText(text)
  const w = WATERMARK_TILE_WIDTH
  const h = WATERMARK_TILE_HEIGHT
  const cx = w / 2
  const cy = h / 2
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <text x="${cx}" y="${cy}" fill="rgba(255,255,255,${WATERMARK_OPACITY})" font-size="${WATERMARK_FONT_SIZE}" font-family="system-ui,sans-serif" font-weight="${WATERMARK_FONT_WEIGHT}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${WATERMARK_ROTATE_DEG} ${cx} ${cy})">${label}</text>
  </svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
</script>

<template>
  <div
    class="pointer-events-none absolute inset-0 z-[9999] select-none"
    :style="{ width: props.width + 'px', height: props.height + 'px' }"
    aria-hidden
  >
    <div
      class="absolute inset-0"
      :style="{
        backgroundImage: buildWatermarkPattern(props.text),
        backgroundRepeat: 'repeat',
        backgroundSize: `${WATERMARK_TILE_WIDTH}px ${WATERMARK_TILE_HEIGHT}px`,
      }"
    />
  </div>
</template>
