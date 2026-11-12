<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import QRCode from 'qrcode'

const props = defineProps<{ text: string; size: number }>()
const canvasRef = ref<HTMLCanvasElement | null>(null)

async function render() {
  await nextTick()
  const canvas = canvasRef.value
  const text = props.text.trim()
  if (!canvas || !text) return
  await QRCode.toCanvas(canvas, text, {
    width: props.size,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  })
}

onMounted(() => { void render() })
watch(() => [props.text, props.size], () => { void render() })
</script>

<template>
  <canvas
    ref="canvasRef"
    class="block bg-white"
    :style="{ width: size + 'px', height: size + 'px' }"
  />
</template>
