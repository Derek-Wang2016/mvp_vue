<script setup lang="ts">
import { useEditorStore } from '../stores/editorStore'
import { calcRectProportional, type ResizeDir } from '../utils/componentLayout'
import type { GroupBounds } from '../utils/componentGroup'

const HANDLE_SIZE = 8
const HANDLE_HIT = 14

const CURSOR: Record<ResizeDir, string> = {
  nw: 'nwse-resize', se: 'nwse-resize',
  ne: 'nesw-resize', sw: 'nesw-resize',
  n: 'ns-resize', s: 'ns-resize',
  w: 'ew-resize', e: 'ew-resize',
}

const HANDLES: { dir: ResizeDir; style: Record<string, string> }[] = [
  { dir: 'nw', style: { top: `${-HANDLE_HIT / 2}px`, left: `${-HANDLE_HIT / 2}px` } },
  { dir: 'n',  style: { top: `${-HANDLE_HIT / 2}px`, left: '50%', marginLeft: `${-HANDLE_HIT / 2}px` } },
  { dir: 'ne', style: { top: `${-HANDLE_HIT / 2}px`, right: `${-HANDLE_HIT / 2}px` } },
  { dir: 'w',  style: { top: '50%', marginTop: `${-HANDLE_HIT / 2}px`, left: `${-HANDLE_HIT / 2}px` } },
  { dir: 'e',  style: { top: '50%', marginTop: `${-HANDLE_HIT / 2}px`, right: `${-HANDLE_HIT / 2}px` } },
  { dir: 'sw', style: { bottom: `${-HANDLE_HIT / 2}px`, left: `${-HANDLE_HIT / 2}px` } },
  { dir: 's',  style: { bottom: `${-HANDLE_HIT / 2}px`, left: '50%', marginLeft: `${-HANDLE_HIT / 2}px` } },
  { dir: 'se', style: { bottom: `${-HANDLE_HIT / 2}px`, right: `${-HANDLE_HIT / 2}px` } },
]

const props = defineProps<{
  bounds: GroupBounds
  groupId: string
  canvasScale: number
}>()

function handlePointerDown(dir: ResizeDir, e: PointerEvent) {
  e.stopPropagation()
  e.preventDefault()
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)

  const scale = props.canvasScale
  const orig = { ...props.bounds }
  const startX = e.clientX
  const startY = e.clientY
  const store = useEditorStore()
  let historyRecorded = false

  document.body.style.cursor = CURSOR[dir]

  function onMove(ev: PointerEvent) {
    const dx = (ev.clientX - startX) / scale
    const dy = (ev.clientY - startY) / scale
    const next = calcRectProportional(orig, dir, dx, dy)
    store.resizeGroup(props.groupId, next, { recordHistory: !historyRecorded })
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
</script>

<template>
  <!-- 父级 overlay 为 pointer-events:none，手柄须显式开启 -->
  <div class="absolute inset-0 pointer-events-none overflow-visible">
    <div
      v-for="{ dir, style } in HANDLES"
      :key="dir"
      class="flex items-center justify-center"
      :style="{
        position: 'absolute',
        width: `${HANDLE_HIT}px`,
        height: `${HANDLE_HIT}px`,
        cursor: CURSOR[dir],
        pointerEvents: 'auto',
        touchAction: 'none',
        zIndex: 50,
        ...style,
      }"
      @pointerdown="(e: PointerEvent) => handlePointerDown(dir, e)"
    >
      <div
        :style="{
          width: `${HANDLE_SIZE}px`,
          height: `${HANDLE_SIZE}px`,
          background: '#818cf8',
          border: '2px solid #fff',
          borderRadius: '1px',
          pointerEvents: 'none',
        }"
      />
    </div>
  </div>
</template>
