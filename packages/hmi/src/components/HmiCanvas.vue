<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useHmiStore } from '../stores/hmiStore'
import { clampTranslation, screenBoxes } from '../geometry'
import type { HmiShape } from '../types'
import { snapDrag, type Box } from '../canvasGuides'
import Stage from './Stage.vue'
import HmiRulers from './HmiRulers.vue'

const emit = defineEmits<{
  contextmenu: [event: MouseEvent, key: string]
  notice: [message: string | null]
}>()
const props = defineProps<{ showGrid: boolean; showPosition: boolean }>()

const store = useHmiStore()
const { doc, selection, selectedKeys, dragOffset } = storeToRefs(store)
const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLDivElement | null>(null)
const scale = ref(1)
const userZoom = ref<number | null>(null)
const boxSelect = ref<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
let observer: ResizeObserver | null = null

const boxes = computed(() => screenBoxes(doc.value))
const selectedBoxes = computed(() => boxes.value.filter((box) => selectedKeys.value.includes(box.key)))
const otherBoxes = computed<Box[]>(() => boxes.value
  .filter((box) => {
    if (selectedKeys.value.includes(box.key)) return false
    const fullBleed = box.x <= 1 && box.y <= 1 && box.w >= doc.value.screen.w - 2 && box.h >= doc.value.screen.h - 2
    return !fullBleed
  })
  .map((box) => ({ x: box.x, y: box.y, r: box.x + box.w, b: box.y + box.h })))

function zoomToFit() {
  const container = containerRef.value
  if (!container) return
  const next = Math.min((container.clientWidth - 48) / doc.value.screen.w, (container.clientHeight - 48) / doc.value.screen.h)
  scale.value = Math.max(0.1, next)
}

onMounted(() => {
  zoomToFit()
  observer = new ResizeObserver(() => { if (userZoom.value == null) zoomToFit() })
  if (containerRef.value) observer.observe(containerRef.value)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('keydown', onKey)
})

function onKey(event: KeyboardEvent) {
  const tag = (event.target as HTMLElement | null)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
    store.copySelected()
    event.preventDefault()
    return
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'x') {
    store.cutSelected()
    event.preventDefault()
    return
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
    store.paste()
    event.preventDefault()
    return
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    store.removeSelected()
    event.preventDefault()
  }
  const step = event.shiftKey ? 10 : 1
  if (event.key === 'ArrowLeft') store.moveSelected(-step, 0)
  if (event.key === 'ArrowRight') store.moveSelected(step, 0)
  if (event.key === 'ArrowUp') store.moveSelected(0, -step)
  if (event.key === 'ArrowDown') store.moveSelected(0, step)
}

function clientPoint(event: PointerEvent) {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return null
  return { x: (event.clientX - rect.left) / scale.value, y: (event.clientY - rect.top) / scale.value }
}

function finishBox(additive: boolean) {
  const box = boxSelect.value
  boxSelect.value = null
  if (!box) return
  const rect = { x: Math.min(box.x1, box.x2), y: Math.min(box.y1, box.y2), w: Math.abs(box.x2 - box.x1), h: Math.abs(box.y2 - box.y1) }
  if (rect.w < 3 && rect.h < 3) {
    if (!additive) store.clearSelection()
    return
  }
  const hits = boxes.value.filter((item) => {
    const fullBleed = item.x <= 1 && item.y <= 1 && item.w >= doc.value.screen.w - 2 && item.h >= doc.value.screen.h - 2
    if (fullBleed) return false
    return !(item.x + item.w < rect.x || rect.x + rect.w < item.x || item.y + item.h < rect.y || rect.y + rect.h < item.y)
  }).map((item) => item.key)
  store.selectKeys(additive ? [...new Set([...selectedKeys.value, ...hits])] : hits)
}

function beginBox(event: PointerEvent, additive: boolean) {
  const point = clientPoint(event)
  if (!point) return
  boxSelect.value = { x1: point.x, y1: point.y, x2: point.x, y2: point.y }
  const move = (ev: PointerEvent) => {
    const next = clientPoint(ev)
    if (!next || !boxSelect.value) return
    boxSelect.value = { ...boxSelect.value, x2: next.x, y2: next.y }
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    finishBox(additive)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

function onCanvasDown(event: PointerEvent) {
  if (event.button !== 0) return
  const target = event.target as HTMLElement
  if (target.closest('[data-node]') || target.closest('button')) return
  beginBox(event, event.shiftKey || event.ctrlKey || event.metaKey)
}

function limitedDrag(rawDx: number, rawDy: number, moving: { x: number; y: number; r: number; b: number }[]) {
  const snapped = snapDrag(rawDx, rawDy, scale.value, moving, otherBoxes.value)
  const boxes = moving.map((box) => ({ x: box.x, y: box.y, w: box.r - box.x, h: box.b - box.y }))
  return clampTranslation(boxes, snapped.dx, snapped.dy, doc.value.screen.w, doc.value.screen.h)
}

function onTargetDown(event: PointerEvent, key: string) {
  const additive = event.shiftKey || event.ctrlKey || event.metaKey
  store.selectKey(key, additive)
  if (boxes.value.find((box) => box.key === key)?.locked) return
  const movable = () => selectedBoxes.value.filter((box) => !box.locked)
  if (movable().length === 0) return
  const startX = event.clientX
  const startY = event.clientY
  let active = false
  const finish = (ev: PointerEvent) => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', finish)
    window.removeEventListener('pointercancel', finish)
    if (active && (ev.type === 'pointerup' || ev.buttons === 0)) {
      const rawDx = (ev.clientX - startX) / scale.value
      const rawDy = (ev.clientY - startY) / scale.value
      const moving = movable().map((box) => ({ x: box.x, y: box.y, r: box.x + box.w, b: box.y + box.h }))
      const next = limitedDrag(rawDx, rawDy, moving)
      store.moveSelected(next.dx, next.dy)
    }
    store.dragOffset = null
  }
  const move = (ev: PointerEvent) => {
    if ((ev.buttons & 1) === 0) {
      finish(ev)
      return
    }
    const rawDx = (ev.clientX - startX) / scale.value
    const rawDy = (ev.clientY - startY) / scale.value
    if (!active && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 4) return
    active = true
    const moving = movable().map((box) => ({ x: box.x, y: box.y, r: box.x + box.w, b: box.y + box.h }))
    store.dragOffset = limitedDrag(rawDx, rawDy, moving)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', finish)
  window.addEventListener('pointercancel', finish)
}

function onMenu(event: MouseEvent, key: string) {
  if (!selectedKeys.value.includes(key)) store.selectKey(key, false)
  emit('contextmenu', event, key)
}

const single = computed(() => selectedBoxes.value.length === 1 ? selectedBoxes.value[0] : undefined)
const singleShape = computed(() => {
  const current = selection.value
  return current?.kind === 'shape' ? doc.value.pages[doc.value.active]?.shapes[current.index] : undefined
})

function shapeRotation(shape: HmiShape | undefined): number {
  if (shape?.type === 'rect' || shape?.type === 'circle') return shape.rotate ?? 0
  if (shape?.type === 'line') {
    return Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1) * 180 / Math.PI
  }
  return 0
}

const selectionFrame = computed(() => {
  const box = single.value
  if (!box) return undefined
  const shape = singleShape.value
  if (shape?.type === 'line') {
    const cx = (shape.x1 + shape.x2) / 2
    const cy = (shape.y1 + shape.y2) / 2
    const length = Math.max(1, Math.hypot(shape.x2 - shape.x1, shape.y2 - shape.y1))
    const thickness = Math.max(1, shape.width ?? 1)
    return {
      x: cx - length / 2,
      y: cy - thickness / 2,
      w: length,
      h: thickness,
      rotation: shapeRotation(shape),
      line: true,
      rotatable: true,
    }
  }
  return {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    rotation: shapeRotation(shape),
    line: false,
    rotatable: shape?.type === 'rect' || shape?.type === 'circle',
  }
})

function onResize(dir: string, event: PointerEvent) {
  const box = single.value
  if (!box || box.line) return
  event.stopPropagation()
  event.preventDefault()
  const origin = { ...box }
  const startX = event.clientX
  const startY = event.clientY
  const move = (ev: PointerEvent) => {
    const dx = (ev.clientX - startX) / scale.value
    const dy = (ev.clientY - startY) / scale.value
    let x = origin.x
    let y = origin.y
    let w = origin.w
    let h = origin.h
    if (dir.includes('e')) w = Math.max(8, origin.w + dx)
    if (dir.includes('s')) h = Math.max(8, origin.h + dy)
    if (dir.includes('w')) {
      w = Math.max(8, origin.w - dx)
      x = origin.x + origin.w - w
    }
    if (dir.includes('n')) {
      h = Math.max(8, origin.h - dy)
      y = origin.y + origin.h - h
    }
    const screen = doc.value.screen
    if (x < 0) {
      w += x
      x = 0
    }
    if (y < 0) {
      h += y
      y = 0
    }
    w = Math.min(Math.max(8, w), screen.w - x)
    h = Math.min(Math.max(8, h), screen.h - y)
    store.setBoxRect(box.key, { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) })
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

function onRotate(event: PointerEvent) {
  const frame = selectionFrame.value
  const shape = singleShape.value
  const current = selection.value
  if (!frame?.rotatable || !shape || current?.kind !== 'shape') return
  event.stopPropagation()
  event.preventDefault()
  const start = clientPoint(event)
  if (!start) return
  const center = { x: frame.x + frame.w / 2, y: frame.y + frame.h / 2 }
  const startAngle = Math.atan2(start.y - center.y, start.x - center.x)
  const startRotation = frame.rotation
  const lineOrigin = shape.type === 'line'
    ? { x1: shape.x1, y1: shape.y1, x2: shape.x2, y2: shape.y2 }
    : undefined
  const target = event.currentTarget as HTMLElement
  target.setPointerCapture?.(event.pointerId)
  document.body.style.cursor = 'grabbing'
  const move = (ev: PointerEvent) => {
    const point = clientPoint(ev)
    if (!point) return
    const angle = Math.atan2(point.y - center.y, point.x - center.x)
    let rotation = startRotation + (angle - startAngle) * 180 / Math.PI
    if (ev.shiftKey) rotation = Math.round(rotation / 15) * 15
    store.rotateShape(current.index, rotation, lineOrigin)
  }
  const finish = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', finish)
    window.removeEventListener('pointercancel', finish)
    document.body.style.cursor = ''
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', finish)
  window.addEventListener('pointercancel', finish)
}

const handles = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se']
const handleCursor: Record<string, string> = {
  nw: 'nwse-resize', se: 'nwse-resize',
  ne: 'nesw-resize', sw: 'nesw-resize',
  n: 'ns-resize', s: 'ns-resize',
  w: 'ew-resize', e: 'ew-resize',
}
function handleStyle(dir: string) {
  const style: Record<string, string> = {
    position: 'absolute',
    width: '8px',
    height: '8px',
    background: '#fff',
    border: '1px solid #0284c7',
    cursor: handleCursor[dir] ?? 'default',
  }
  if (dir.includes('n')) style.top = '-4px'
  if (dir.includes('s')) style.bottom = '-4px'
  if (dir.includes('w')) style.left = '-4px'
  if (dir.includes('e')) style.right = '-4px'
  if (dir === 'n' || dir === 's') { style.left = '50%'; style.marginLeft = '-4px' }
  if (dir === 'w' || dir === 'e') { style.top = '50%'; style.marginTop = '-4px' }
  return style
}

const PALETTE_MIME = 'application/x-hmi-component'

function isPaletteDrag(dt: DataTransfer): boolean {
  return Array.from(dt.types).includes(PALETTE_MIME) || Array.from(dt.types).includes('text/plain')
}

function onPaletteDragOver(event: DragEvent) {
  const dt = event.dataTransfer
  if (!dt || !isPaletteDrag(dt)) return
  event.preventDefault()
  dt.dropEffect = 'copy'
}

function onPaletteDrop(event: DragEvent) {
  const dt = event.dataTransfer
  if (!dt) return
  const raw = dt.getData(PALETTE_MIME) || dt.getData('text/plain')
  const [kind, type] = raw.split(':')
  if (kind !== 'shape' && kind !== 'card') return
  event.preventDefault()
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return
  const x = Math.max(0, Math.min(doc.value.screen.w - 8, (event.clientX - rect.left) / scale.value))
  const y = Math.max(0, Math.min(doc.value.screen.h - 8, (event.clientY - rect.top) / scale.value))
  const error = kind === 'card'
    ? store.addCard(x, y)
    : store.addShape(type as HmiShape['type'], x, y)
  emit('notice', error)
}

function onWheel(event: WheelEvent) {
  if (!event.ctrlKey && !event.metaKey) return
  event.preventDefault()
  const current = Math.round(scale.value * 100)
  const next = Math.min(400, Math.max(10, current + (event.deltaY < 0 ? 10 : -10)))
  userZoom.value = next
  scale.value = next / 100
}
</script>

<template>
  <HmiRulers
    :page-width="doc.screen.w"
    :page-height="doc.screen.h"
    :scale="scale"
    :selected="selectedBoxes"
    :others="otherBoxes"
    :drag="dragOffset"
  >
    <div
      ref="containerRef"
      class="canvas-zoom-container editor-scrollbar relative min-h-0 min-w-0 flex-1 overflow-auto bg-slate-950"
      @dragenter="onPaletteDragOver"
      @dragover="onPaletteDragOver"
      @drop="onPaletteDrop"
      @wheel="onWheel"
    >
      <div :style="{ width: (doc.screen.w * scale + 48) + 'px', height: (doc.screen.h * scale + 48) + 'px' }" class="relative">
        <div
          ref="canvasRef"
          class="hmi-canvas editor-canvas-frame absolute left-6 top-6 border-2 border-slate-400/50"
          :style="{ width: doc.screen.w + 'px', height: doc.screen.h + 'px', transform: `scale(${scale})`, transformOrigin: '0 0' }"
          @pointerdown="onCanvasDown"
        >
          <div
            v-if="props.showGrid"
            data-grid="true"
            class="pointer-events-none absolute inset-0"
            :style="{ backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.3) 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }"
          />
          <Stage
            :doc="doc"
            :selection="selection"
            :selected-keys="selectedKeys"
            :drag="dragOffset"
            :show-position="showPosition"
            @target-down="onTargetDown"
            @target-menu="onMenu"
            @select="store.select"
          />
          <div
            v-if="selectionFrame && !single?.locked"
            class="pointer-events-none absolute z-20 border border-sky-400"
            :style="{
              left: selectionFrame.x + (dragOffset?.dx ?? 0) + 'px',
              top: selectionFrame.y + (dragOffset?.dy ?? 0) + 'px',
              width: selectionFrame.w + 'px',
              height: selectionFrame.h + 'px',
              transform: selectionFrame.rotation ? `rotate(${selectionFrame.rotation}deg)` : undefined,
              transformOrigin: '50% 50%',
            }"
          >
            <button
              v-if="selectionFrame.rotatable"
              type="button"
              title="旋转（按住 Shift 以 15° 吸附）"
              aria-label="旋转图元"
              class="pointer-events-auto absolute left-1/2 top-[-28px] h-7 w-3 -translate-x-1/2 cursor-grab touch-none"
              @pointerdown="onRotate"
            >
              <span class="pointer-events-none absolute left-1/2 top-2.5 h-[18px] w-0.5 -translate-x-1/2 bg-sky-400" />
              <span class="pointer-events-none absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-sky-400" />
            </button>
            <button
              v-for="dir in handles"
              v-if="!selectionFrame.line"
              :key="dir"
              type="button"
              class="pointer-events-auto"
              :style="handleStyle(dir)"
              @pointerdown="onResize(dir, $event)"
            />
          </div>
          <span
            v-if="showPosition && single"
            class="pointer-events-none absolute bg-black/60 px-1 text-[10px] text-yellow-300"
            :style="{ left: single.x + 'px', top: (single.y - 14) + 'px' }"
          >{{ Math.round(single.x) }}, {{ Math.round(single.y) }}</span>
          <div
            v-if="boxSelect"
            class="pointer-events-none absolute border border-sky-400 bg-sky-400/20"
            :style="{
              left: Math.min(boxSelect.x1, boxSelect.x2) + 'px',
              top: Math.min(boxSelect.y1, boxSelect.y2) + 'px',
              width: Math.abs(boxSelect.x2 - boxSelect.x1) + 'px',
              height: Math.abs(boxSelect.y2 - boxSelect.y1) + 'px',
            }"
          />
        </div>
      </div>
    </div>
  </HmiRulers>
</template>
