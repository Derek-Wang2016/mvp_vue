<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { alignEdges, guideLinesRef, type GuideAxis } from '../canvasGuides'

const SIZE = 22
type GuideLine = { id: string; axis: GuideAxis; pos: number }

const props = defineProps<{
  pageWidth: number
  pageHeight: number
  scale: number
  selected: { x: number; y: number; w: number; h: number }[]
  others: { x: number; y: number; r: number; b: number }[]
  drag: { dx: number; dy: number } | null
}>()

const hRef = ref<HTMLCanvasElement>()
const vRef = ref<HTMLCanvasElement>()
const guideRef = ref<HTMLCanvasElement>()
const rootRef = ref<HTMLDivElement>()
const guides = ref<GuideLine[]>([])
const view = ref({ originX: 0, originY: 0, scale: 1 })

function tickStep(scale: number) {
  const steps = [10, 20, 50, 100, 200, 500, 1000]
  return steps.find((step) => step * scale >= 48) ?? 1000
}

function paintAxis(canvas: HTMLCanvasElement, horizontal: boolean, origin: number, length: number, scale: number, span: { start: number; size: number } | null) {
  const dpr = window.devicePixelRatio || 1
  const cssW = canvas.clientWidth
  const cssH = canvas.clientHeight
  canvas.width = Math.max(1, Math.round(cssW * dpr))
  canvas.height = Math.max(1, Math.round(cssH * dpr))
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cssW, cssH)
  ctx.fillStyle = '#0c1522'
  ctx.fillRect(0, 0, cssW, cssH)
  if (span && span.size > 0) {
    const a = origin + span.start * scale
    const b = origin + (span.start + span.size) * scale
    ctx.fillStyle = 'rgba(59,130,246,0.45)'
    if (horizontal) ctx.fillRect(a, 0, Math.max(1, b - a), cssH)
    else ctx.fillRect(0, a, cssW, Math.max(1, b - a))
  }
  ctx.strokeStyle = 'rgba(148,163,184,0.55)'
  ctx.fillStyle = '#94a3b8'
  ctx.font = '10px sans-serif'
  const step = tickStep(scale)
  const start = Math.floor(-origin / scale / step) * step
  for (let value = start; value <= length + step; value += step) {
    const pos = origin + value * scale
    if (pos < -20 || pos > (horizontal ? cssW : cssH) + 20) continue
    ctx.beginPath()
    if (horizontal) {
      ctx.moveTo(pos, cssH)
      ctx.lineTo(pos, 4)
      ctx.stroke()
      if (value >= 0) ctx.fillText(String(value), pos + 3, 12)
    } else {
      ctx.moveTo(cssW, pos)
      ctx.lineTo(4, pos)
      ctx.stroke()
      if (value >= 0) {
        ctx.save()
        ctx.translate(12, pos + 3)
        ctx.rotate(-Math.PI / 2)
        ctx.textAlign = 'right'
        ctx.fillText(String(value), 0, 0)
        ctx.restore()
      }
    }
  }
}

function draw() {
  const root = rootRef.value
  const h = hRef.value
  const v = vRef.value
  if (!root || !h || !v) return
  const container = root.querySelector('.canvas-zoom-container')
  const frame = root.querySelector('.editor-canvas-frame')
  if (!container) return
  const scale = props.scale || 1
  const box = container.getBoundingClientRect()
  const frameBox = frame?.getBoundingClientRect()
  const originX = frameBox ? frameBox.left - box.left : 0
  const originY = frameBox ? frameBox.top - box.top : 0
  const drag = props.drag ?? { dx: 0, dy: 0 }
  let spanX: { start: number; size: number } | null = null
  let spanY: { start: number; size: number } | null = null
  if (props.selected.length) {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const item of props.selected) {
      minX = Math.min(minX, item.x + drag.dx)
      minY = Math.min(minY, item.y + drag.dy)
      maxX = Math.max(maxX, item.x + item.w + drag.dx)
      maxY = Math.max(maxY, item.y + item.h + drag.dy)
    }
    spanX = { start: minX, size: maxX - minX }
    spanY = { start: minY, size: maxY - minY }
  }
  paintAxis(h, true, originX, props.pageWidth, scale, spanX)
  paintAxis(v, false, originY, props.pageHeight, scale, spanY)
  const guide = guideRef.value
  if (guide) {
    const dpr = window.devicePixelRatio || 1
    guide.width = Math.max(1, Math.round(root.clientWidth * dpr))
    guide.height = Math.max(1, Math.round(root.clientHeight * dpr))
    const gctx = guide.getContext('2d')
    if (gctx) {
      gctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      gctx.clearRect(0, 0, root.clientWidth, root.clientHeight)
      const paintLine = (axis: GuideAxis, pos: number, color: string) => {
        gctx.strokeStyle = color
        gctx.beginPath()
        if (axis === 'x') {
          const x = SIZE + originX + pos * scale
          gctx.moveTo(x, 0)
          gctx.lineTo(x, root.clientHeight)
        } else {
          const y = SIZE + originY + pos * scale
          gctx.moveTo(0, y)
          gctx.lineTo(root.clientWidth, y)
        }
        gctx.stroke()
      }
      for (const line of guides.value) paintLine(line.axis, line.pos, '#22d3ee')
      if (props.drag && spanX && spanY) {
        const moving = [{ x: spanX.start, y: spanY.start, r: spanX.start + spanX.size, b: spanY.start + spanY.size }]
        for (const line of alignEdges(moving, props.others, 0.6)) paintLine(line.axis, line.pos, '#f43f5e')
      }
    }
  }
  view.value = { originX, originY, scale }
  guideLinesRef.current = guides.value
}

let stopWatch: (() => void) | null = null
let containerEl: Element | null = null
let observer: ResizeObserver | null = null

onMounted(() => {
  const root = rootRef.value
  containerEl = root?.querySelector('.canvas-zoom-container') ?? null
  containerEl?.addEventListener('scroll', draw, { passive: true })
  if (containerEl) {
    observer = new ResizeObserver(() => draw())
    observer.observe(containerEl)
  }
  stopWatch = watch(() => [props.pageWidth, props.pageHeight, props.scale, props.drag, props.selected, guides.value], () => draw(), { deep: true, immediate: true })
})

onBeforeUnmount(() => {
  stopWatch?.()
  containerEl?.removeEventListener('scroll', draw)
  observer?.disconnect()
})

function toDesign(clientX: number, clientY: number) {
  const root = rootRef.value?.getBoundingClientRect()
  const { originX, originY, scale } = view.value
  if (!root || scale <= 0) return { x: 0, y: 0 }
  return {
    x: (clientX - root.left - SIZE - originX) / scale,
    y: (clientY - root.top - SIZE - originY) / scale,
  }
}

function onRulerDown(axis: GuideAxis, event: PointerEvent) {
  if (event.button !== 0) return
  event.preventDefault()
  const id = `g-${Date.now()}`
  const point = toDesign(event.clientX, event.clientY)
  guides.value = [...guides.value, { id, axis, pos: axis === 'x' ? point.x : point.y }]
  const move = (ev: PointerEvent) => {
    const next = toDesign(ev.clientX, ev.clientY)
    guides.value = guides.value.map((line) => (line.id === id ? { ...line, pos: axis === 'x' ? next.x : next.y } : line))
  }
  const up = (ev: PointerEvent) => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    const root = rootRef.value?.getBoundingClientRect()
    if (!root) return
    const back = axis === 'x' ? ev.clientX <= root.left + SIZE : ev.clientY <= root.top + SIZE
    if (back) guides.value = guides.value.filter((line) => line.id !== id)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}
</script>

<template>
  <div ref="rootRef" class="relative flex min-h-0 min-w-0 flex-1 flex-col">
    <canvas ref="guideRef" class="pointer-events-none absolute inset-0 z-20 h-full w-full" />
    <div class="flex shrink-0">
      <div class="shrink-0 border-b border-r border-white/10 bg-[#0c1522]" :style="{ width: '22px', height: '22px' }" />
      <canvas ref="hRef" class="h-[22px] min-w-0 flex-1 cursor-ns-resize border-b border-white/10 bg-[#0c1522]" @pointerdown="onRulerDown('y', $event)" />
    </div>
    <div class="flex min-h-0 min-w-0 flex-1">
      <canvas ref="vRef" class="h-full w-[22px] shrink-0 cursor-ew-resize border-r border-white/10 bg-[#0c1522]" @pointerdown="onRulerDown('x', $event)" />
      <slot />
    </div>
  </div>
</template>
