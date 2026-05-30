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
    const next = calcRect(orig, dir, dx, dy)
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
