<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed } from 'vue'
import QRCode from 'qrcode'
import {
  DEFAULT_CARD_QR_BG_COLOR,
  DEFAULT_CARD_QR_COLOR,
  DEFAULT_CARD_QR_MARGIN,
  DEFAULT_CARD_QR_SIZE_PX,
} from '@mvp-vue/schema'

const props = defineProps<{
  text: string
  sizePx?: number
  margin?: number
  color?: string
  bgColor?: string
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let renderToken = 0

const resolvedSizePx = computed(() => props.sizePx ?? DEFAULT_CARD_QR_SIZE_PX)

async function renderQr() {
  await nextTick()
  const canvas = canvasRef.value
  const text = props.text.trim()
  if (!canvas || !text) return

  const token = ++renderToken
  try {
    await QRCode.toCanvas(canvas, text, {
      width: resolvedSizePx.value,
      margin: props.margin ?? DEFAULT_CARD_QR_MARGIN,
      color: {
        dark: props.color?.trim() || DEFAULT_CARD_QR_COLOR,
        light: props.bgColor?.trim() || DEFAULT_CARD_QR_BG_COLOR,
      },
    })
  } catch {
    if (token !== renderToken) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const size = resolvedSizePx.value
    canvas.width = size
    canvas.height = size
    ctx.clearRect(0, 0, size, size)
  }
}

onMounted(() => {
  void renderQr()
})

watch(
  () => [props.text, props.sizePx, props.margin, props.color, props.bgColor] as const,
  () => {
    void renderQr()
  },
)
</script>

<template>
  <canvas
    ref="canvasRef"
    class="block max-w-full h-auto shrink-0"
    role="img"
    :style="{ width: `${resolvedSizePx}px`, height: `${resolvedSizePx}px` }"
    :aria-label="`二维码：${text}`"
  />
</template>
