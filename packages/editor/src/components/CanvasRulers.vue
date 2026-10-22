<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '../stores/editorStore'
import { alignmentHits, guideLinesRef, type GuideAxis } from './canvasGuides'

const SIZE = 22

type GuideLine = { id: string; axis: GuideAxis; pos: number }

const hRef = ref<HTMLCanvasElement>()
const vRef = ref<HTMLCanvasElement>()
const guideRef = ref<HTMLCanvasElement>()
const rootRef = ref<HTMLDivElement>()
const guides = ref<GuideLine[]>([])
const view = ref({ originX: 0, originY: 0, scale: 1 })

const store = useEditorStore()
const { components, selectedIds, groupDragOffset, pageWidth, pageHeight, canvasScale } = storeToRefs(store)

function tickStep(scale: number) {
  const steps = [10, 20, 50, 100, 200, 500, 1000, 2000]
  return steps.find((step) => step * scale >= 48) ?? 2000
}

function paintSpan(
  ctx: CanvasRenderingContext2D,
  horizontal: boolean,
  origin: number,
  scale: number,
  start: number,
  size: number,
  cssW: number,
  cssH: number,
) {
  const a = origin + start * scale
  const b = origin + (start + size) * scale
  ctx.fillStyle = 'rgba(59,130,246,0.45)'
  if (horizontal) ctx.fillRect(a, 0, Math.max(1, b - a), cssH)
  else ctx.fillRect(0, a, cssW, Math.max(1, b - a))
  ctx.fillStyle = '#eff6ff'
  ctx.font = '10px sans-serif'
  const label = String(Math.round(size))
  if (horizontal) {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, (a + b) / 2, cssH / 2)
  } else {
    ctx.save()
    ctx.translate(cssW / 2, (a + b) / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, 0, 0)
    ctx.restore()
  }
}

function paintAxis(
  canvas: HTMLCanvasElement,
  horizontal: boolean,
  origin: number,
  length: number,
  scale: number,
  span: { start: number; size: number } | null,
) {
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
  if (span && span.size > 0) paintSpan(ctx, horizontal, origin, scale, span.start, span.size, cssW, cssH)
  ctx.strokeStyle = 'rgba(148,163,184,0.55)'
  ctx.fillStyle = '#94a3b8'
  ctx.font = '10px sans-serif'
  ctx.lineWidth = 1
  const step = tickStep(scale)
  const start = Math.floor(-origin / scale / step) * step
  const end = length + step
  for (let value = start; value <= end; value += step) {
    const pos = origin + value * scale
    if (pos < -20 || pos > (horizontal ? cssW : cssH) + 20) continue
    const minor = step / 5
    for (let m = 1; m < 5; m++) {
      const mp = origin + (value + minor * m) * scale
      ctx.beginPath()
      if (horizontal) {
        ctx.moveTo(mp, cssH)
        ctx.lineTo(mp, cssH - 5)
      } else {
        ctx.moveTo(cssW, mp)
        ctx.lineTo(cssW - 5, mp)
      }
      ctx.stroke()
    }
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
  const scale = canvasScale.value || 1
  const box = container.getBoundingClientRect()
  const frameBox = frame?.getBoundingClientRect()
  const originX = frameBox ? frameBox.left - box.left : 0
  const originY = frameBox ? frameBox.top - box.top : 0
  const drag = groupDragOffset.value ?? { dx: 0, dy: 0 }
  const selected = components.value.filter((comp) => selectedIds.value.includes(comp.id))
  let spanX: { start: number; size: number } | null = null
  let spanY: { start: number; size: number } | null = null
  if (selected.length > 0) {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const comp of selected) {
      const x = comp.x + drag.dx
      const y = comp.y + drag.dy
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x + comp.w)
      maxY = Math.max(maxY, y + comp.h)
    }
    spanX = { start: minX, size: maxX - minX }
    spanY = { start: minY, size: maxY - minY }
  }
  paintAxis(h, true, originX, pageWidth.value, scale, spanX)
  paintAxis(v, false, originY, pageHeight.value, scale, spanY)

  const guide = guideRef.value
  if (guide) {
    const dpr = window.devicePixelRatio || 1
    const cssW = root.clientWidth
    const cssH = root.clientHeight
    guide.width = Math.max(1, Math.round(cssW * dpr))
    guide.height = Math.max(1, Math.round(cssH * dpr))
    const gctx = guide.getContext('2d')
    if (gctx) {
      gctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      gctx.clearRect(0, 0, cssW, cssH)
      gctx.lineWidth = 1
      const paintLine = (axis: GuideAxis, pos: number, color: string) => {
        gctx.strokeStyle = color
        gctx.beginPath()
        if (axis === 'x') {
          const x = SIZE + originX + pos * scale
          gctx.moveTo(x, 0)
          gctx.lineTo(x, cssH)
        } else {
          const y = SIZE + originY + pos * scale
          gctx.moveTo(0, y)
          gctx.lineTo(cssW, y)
        }
        gctx.stroke()
      }
      for (const line of guides.value) paintLine(line.axis, line.pos, '#22d3ee')
      if (groupDragOffset.value) {
        for (const line of alignmentHits(0.6)) paintLine(line.axis, line.pos, '#f43f5e')
      }
    }
  }
  view.value = { originX, originY, scale }
  guideLinesRef.current = guides.value
}

let stopWatch: (() => void) | null = null
let containerEl: Element | null = null
let observer: ResizeObserver | null = null

function onScroll() {
  draw()
}

onMounted(() => {
  const root = rootRef.value
  containerEl = root?.querySelector('.canvas-zoom-container') ?? null
  containerEl?.addEventListener('scroll', onScroll, { passive: true })
  if (containerEl) {
    observer = new ResizeObserver(() => draw())
    observer.observe(containerEl)
  }
  stopWatch = watch(
    [components, selectedIds, groupDragOffset, pageWidth, pageHeight, canvasScale, guides],
    () => draw(),
    { deep: true, immediate: true },
  )
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

function onRulerDown(axis: GuideAxis, e: PointerEvent) {
  if (e.button !== 0) return
  e.preventDefault()
  e.stopPropagation()
  const id = `g-${Date.now()}-${Math.round(Math.random() * 1000)}`
  const p = toDesign(e.clientX, e.clientY)
  const pos = axis === 'x' ? p.x : p.y
  guides.value = [...guides.value, { id, axis, pos }]
  const move = (ev: PointerEvent) => {
    const next = toDesign(ev.clientX, ev.clientY)
    const value = axis === 'x' ? next.x : next.y
    guides.value = guides.value.map((line) => (line.id === id ? { ...line, pos: value } : line))
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

function onGuideDown(id: string, axis: GuideAxis, e: PointerEvent) {
  if (e.button !== 0) return
  e.preventDefault()
  e.stopPropagation()
  const move = (ev: PointerEvent) => {
    const next = toDesign(ev.clientX, ev.clientY)
    const value = axis === 'x' ? next.x : next.y
    guides.value = guides.value.map((line) => (line.id === id ? { ...line, pos: value } : line))
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

onBeforeUnmount(() => {
  stopWatch?.()
  containerEl?.removeEventListener('scroll', onScroll)
  observer?.disconnect()
})
</script>

<template>
  <div ref="rootRef" class="relative flex-1 min-w-0 min-h-0 flex flex-col">
    <canvas ref="guideRef" class="absolute inset-0 z-20 w-full h-full pointer-events-none" />
    <div class="flex shrink-0">
      <div class="shrink-0 bg-[#0c1522] border-b border-r border-white/10" :style="{ width: `${SIZE}px`, height: `${SIZE}px` }" />
      <canvas ref="hRef" class="h-[22px] flex-1 min-w-0 border-b border-white/10 bg-[#0c1522] cursor-ns-resize" @pointerdown="(e: PointerEvent) => onRulerDown('y', e)" />
    </div>
    <div class="flex flex-1 min-h-0 min-w-0">
      <canvas ref="vRef" class="w-[22px] h-full shrink-0 border-r border-white/10 bg-[#0c1522] cursor-ew-resize" @pointerdown="(e: PointerEvent) => onRulerDown('x', e)" />
      <slot />
      <template v-for="line in guides" :key="line.id">
        <div
          v-if="line.axis === 'x'"
          title="拖回左侧标尺可删除"
          class="absolute z-30 cursor-ew-resize"
          :style="{ left: `${SIZE + view.originX + line.pos * (view.scale || 1) - 4}px`, top: '0', width: '8px', bottom: '0' }"
          @pointerdown="(e: PointerEvent) => onGuideDown(line.id, line.axis, e)"
        />
        <div
          v-else
          title="拖回上方标尺可删除"
          class="absolute z-30 cursor-ns-resize"
          :style="{ top: `${SIZE + view.originY + line.pos * (view.scale || 1) - 4}px`, left: '0', height: '8px', right: '0' }"
          @pointerdown="(e: PointerEvent) => onGuideDown(line.id, line.axis, e)"
        />
      </template>
    </div>
  </div>
</template>
