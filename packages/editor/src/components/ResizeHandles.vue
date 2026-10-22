<script setup lang="ts">
import type { PageComponent } from '@mvp-vue/schema'
import { isComponentLocked } from '@mvp-vue/schema'
import { useEditorStore } from '../stores/editorStore'

type Dir = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se'

const HANDLE_SIZE = 8
const MIN_W = 30
const MIN_H = 20

const CURSOR: Record<Dir, string> = {
  nw: 'nwse-resize', se: 'nwse-resize',
  ne: 'nesw-resize', sw: 'nesw-resize',
  n: 'ns-resize', s: 'ns-resize',
  w: 'ew-resize', e: 'ew-resize',
}

const HANDLES: { dir: Dir; style: Record<string, string> }[] = [
  { dir: 'nw', style: { top: `${-HANDLE_SIZE / 2}px`, left: `${-HANDLE_SIZE / 2}px` } },
  { dir: 'n',  style: { top: `${-HANDLE_SIZE / 2}px`, left: '50%', marginLeft: `${-HANDLE_SIZE / 2}px` } },
  { dir: 'ne', style: { top: `${-HANDLE_SIZE / 2}px`, right: `${-HANDLE_SIZE / 2}px` } },
  { dir: 'w',  style: { top: '50%', marginTop: `${-HANDLE_SIZE / 2}px`, left: `${-HANDLE_SIZE / 2}px` } },
  { dir: 'e',  style: { top: '50%', marginTop: `${-HANDLE_SIZE / 2}px`, right: `${-HANDLE_SIZE / 2}px` } },
  { dir: 'sw', style: { bottom: `${-HANDLE_SIZE / 2}px`, left: `${-HANDLE_SIZE / 2}px` } },
  { dir: 's',  style: { bottom: `${-HANDLE_SIZE / 2}px`, left: '50%', marginLeft: `${-HANDLE_SIZE / 2}px` } },
  { dir: 'se', style: { bottom: `${-HANDLE_SIZE / 2}px`, right: `${-HANDLE_SIZE / 2}px` } },
]

const props = defineProps<{ comp: PageComponent; canvasScale: number }>()

function calcRect(
  orig: { x: number; y: number; w: number; h: number },
  dir: Dir,
  dx: number,
  dy: number,
) {
  const rect = { x: orig.x, y: orig.y, w: orig.w, h: orig.h }

  if (dir.includes('e')) rect.w = Math.max(MIN_W, orig.w + dx)
  if (dir.includes('w')) {
    const nw = Math.max(MIN_W, orig.w - dx)
    rect.x = orig.x + orig.w - nw
    rect.w = nw
  }
  if (dir.includes('s')) rect.h = Math.max(MIN_H, orig.h + dy)
  if (dir.includes('n')) {
    const nh = Math.max(MIN_H, orig.h - dy)
    rect.y = orig.y + orig.h - nh
    rect.h = nh
  }
  return rect
}

/** Shift 等比缩放：固定对角/对边，保持初始宽高比 */
function calcRectProportional(
  orig: { x: number; y: number; w: number; h: number },
  dir: Dir,
  dx: number,
  dy: number,
) {
  const ratio = orig.w / orig.h

  let newW = orig.w
  let newH = orig.h

  if (dir.includes('e')) newW = orig.w + dx
  if (dir.includes('w')) newW = orig.w - dx
  if (dir.includes('s')) newH = orig.h + dy
  if (dir.includes('n')) newH = orig.h - dy

  if (dir.length === 2) {
    const scaleW = newW / orig.w
    const scaleH = newH / orig.h
    if (Math.abs(scaleW - 1) >= Math.abs(scaleH - 1)) {
      newH = newW / ratio
    } else {
      newW = newH * ratio
    }
  } else if (dir === 'e' || dir === 'w') {
    newH = newW / ratio
  } else {
    newW = newH * ratio
  }

  if (newW < MIN_W) {
    newW = MIN_W
    newH = newW / ratio
  }
  if (newH < MIN_H) {
    newH = MIN_H
    newW = newH * ratio
  }
  newW = Math.max(MIN_W, newW)
  newH = Math.max(MIN_H, newH)

  let x = orig.x
  let y = orig.y
  if (dir.includes('w')) x = orig.x + orig.w - newW
  if (dir.includes('n')) y = orig.y + orig.h - newH

  return { x, y, w: newW, h: newH }
}

function pagePoint(ev: PointerEvent) {
  const canvas = document.querySelector('.dnd-canvas') as HTMLElement | null
  const scale = props.canvasScale || 1
  if (!canvas) return { x: ev.clientX / scale, y: ev.clientY / scale }
  const rect = canvas.getBoundingClientRect()
  return {
    x: (ev.clientX - rect.left) / scale,
    y: (ev.clientY - rect.top) / scale,
  }
}

function normalizeDeg(deg: number) {
  let d = Math.round(deg) % 360
  if (d > 180) d -= 360
  if (d <= -180) d += 360
  return d
}

function handleRotateDown(e: PointerEvent) {
  if (isComponentLocked(props.comp)) return
  e.stopPropagation()
  e.preventDefault()
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)

  const cx = props.comp.x + props.comp.w / 2
  const cy = props.comp.y + props.comp.h / 2
  const start = pagePoint(e)
  const startAngle = Math.atan2(start.y - cy, start.x - cx)
  const orig = props.comp.rotate ?? 0
  let historyRecorded = false
  document.body.style.cursor = 'grabbing'

  function onMove(ev: PointerEvent) {
    const p = pagePoint(ev)
    const angle = Math.atan2(p.y - cy, p.x - cx)
    let deg = orig + ((angle - startAngle) * 180) / Math.PI
    if (ev.shiftKey) deg = Math.round(deg / 15) * 15
    useEditorStore().setComponentRotate(props.comp.id, normalizeDeg(deg), !historyRecorded)
    historyRecorded = true
  }

  function onUp() {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    document.body.style.cursor = ''
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

function handlePointerDown(dir: Dir, e: PointerEvent) {
  if (isComponentLocked(props.comp)) return
  e.stopPropagation()
  e.preventDefault()
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)

  const scale = props.canvasScale
  const orig = { x: props.comp.x, y: props.comp.y, w: props.comp.w, h: props.comp.h }
  const startX = e.clientX
  const startY = e.clientY

  document.body.style.cursor = CURSOR[dir]

  function onMove(ev: PointerEvent) {
    const dx = (ev.clientX - startX) / scale
    const dy = (ev.clientY - startY) / scale
    const next = ev.shiftKey
      ? calcRectProportional(orig, dir, dx, dy)
      : calcRect(orig, dir, dx, dy)
    useEditorStore().resizeComponent(props.comp.id, next.x, next.y, next.w, next.h)
  }

  function onUp() {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    document.body.style.cursor = ''
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}
</script>

<template>
  <div
    title="旋转（按住 Shift 按 15° 吸附）"
    class="absolute z-[11] cursor-grab"
    :style="{ left: '50%', top: '-28px', width: '12px', height: '28px', marginLeft: '-6px' }"
    @pointerdown="(e: PointerEvent) => handleRotateDown(e)"
  >
    <div class="absolute left-[5px] top-[10px] w-[2px] h-[18px] bg-blue-500 pointer-events-none" />
    <div class="absolute left-0 top-0 w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
  </div>
  <div
    v-for="{ dir, style } in HANDLES"
    :key="dir"
    :style="{
      position: 'absolute',
      width: `${HANDLE_SIZE}px`,
      height: `${HANDLE_SIZE}px`,
      cursor: CURSOR[dir],
      background: '#3b82f6',
      border: '2px solid #fff',
      borderRadius: '1px',
      zIndex: 10,
      ...style,
    }"
    @pointerdown="(e: PointerEvent) => handlePointerDown(dir, e)"
  />
</template>
