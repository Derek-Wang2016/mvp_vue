<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import type { PageComponent, ComponentType } from '@mvp-vue/schema'
import { isComponentLocked, buildGradientBackground } from '@mvp-vue/schema'
import { useEditorStore } from '../stores/editorStore'
import { storeToRefs } from 'pinia'
import ResizeHandles from './ResizeHandles.vue'
import ComponentPreview from './canvas/ComponentPreview.vue'
import { getEditorDef } from './registry/registry'

const emit = defineEmits<{
  contextmenu: [e: MouseEvent, compId: string]
}>()

const store = useEditorStore()
const { components, pageWidth, pageHeight, bgColor, bgColorTo, bgGradient, bgImage, bgOpacity, selectedIds, groupDragOffset, pageReadOnly, canvasScale, hasUserZoomed, pageId, fitRequestCount } = storeToRefs(store)

const props = defineProps<{
  showGrid: boolean
  showComponentPosition: boolean
}>()

const wrapperRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLDivElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

const editingCompId = ref<string | null>(null)

interface BoxRect { x1: number; y1: number; x2: number; y2: number }
const boxSelect = ref<BoxRect | null>(null)
const pointerDownPos = ref<{ x: number; y: number } | null>(null)

// --- grab-pan (Ctrl + drag to scroll) ---
interface PanState { startX: number; startY: number; scrollLeft: number; scrollTop: number }
const panState = ref<PanState | null>(null)
const ctrlHeld = ref(false)

function rectsIntersect(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y)
}

function pointInComp(c: PageComponent, x: number, y: number) {
  return x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h
}

/** 画布坐标：重叠区优先命中已选组件（数组靠后者为上层）；锁定组件不参与命中 */
function resolvePointerTarget(domComp: PageComponent, canvasX: number, canvasY: number): PageComponent {
  const hit = components.value.filter((c) => !isComponentLocked(c) && pointInComp(c, canvasX, canvasY))
  if (hit.length === 0) return domComp
  const selectedHit = hit.filter((c) => selectedIds.value.includes(c.id))
  if (selectedHit.length > 0) return selectedHit[selectedHit.length - 1]!
  return hit[hit.length - 1]!
}

function clientToCanvas(e: PointerEvent) {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return null
  const scale = canvasScale.value
  return {
    x: (e.clientX - rect.left) / scale,
    y: (e.clientY - rect.top) / scale,
    scale,
  }
}

/** 未选中保持原序，选中项渲染在上层以便点选与手柄 */
const displayComponents = computed(() => {
  const selectedSet = new Set(selectedIds.value)
  const unselected = components.value.filter((c) => !selectedSet.has(c.id))
  const selected = components.value.filter((c) => selectedSet.has(c.id))
  return [...unselected, ...selected]
})

function zoomToFit() {
  const container = containerRef.value
  if (!container) return
  const cw = container.clientWidth - 32
  const ch = container.clientHeight - 32
  const fitPercent = Math.round(Math.min(cw / pageWidth.value, ch / pageHeight.value) * 100)
  store.setZoom(fitPercent)
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  zoomToFit()
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      if (!hasUserZoomed.value) zoomToFit()
    })
    resizeObserver.observe(containerRef.value)
  }
  window.addEventListener('keydown', onCtrlKeyDown)
  window.addEventListener('keyup', onCtrlKeyUp)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  endDragSession()
  window.removeEventListener('keydown', onCtrlKeyDown)
  window.removeEventListener('keyup', onCtrlKeyUp)
})

watch([pageWidth, pageHeight], () => {
  if (!hasUserZoomed.value) zoomToFit()
})

// 切换页面时重置为自动适应
watch(pageId, () => {
  store.resetUserZoomFlag()
  nextTick(() => zoomToFit())
})

// 工具栏"适应窗口"按钮
watch(fitRequestCount, () => {
  nextTick(() => zoomToFit())
})

// selection helpers
function isSelected(compId: string) {
  return selectedIds.value.includes(compId)
}

function isOnlySelected(compId: string) {
  return selectedIds.value.length === 1 && selectedIds.value[0] === compId
}

// box select
function handlePointerDown(e: PointerEvent) {
  const target = e.target as HTMLElement
  if (!target.classList.contains('dnd-canvas') && target.getAttribute('data-grid') !== 'true') return
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return
  const scale = canvasScale.value
  const x = (e.clientX - rect.left) / scale
  const y = (e.clientY - rect.top) / scale
  pointerDownPos.value = { x, y }
  boxSelect.value = { x1: x, y1: y, x2: x, y2: y }
}

function handlePointerMove(e: PointerEvent) {
  if (!pointerDownPos.value || !boxSelect.value) return
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return
  const scale = canvasScale.value
  const x = (e.clientX - rect.left) / scale
  const y = (e.clientY - rect.top) / scale
  boxSelect.value = { x1: boxSelect.value.x1, y1: boxSelect.value.y1, x2: x, y2: y }
}

function handlePointerUp() {
  if (!boxSelect.value) return
  const startX = pointerDownPos.value?.x ?? 0
  const startY = pointerDownPos.value?.y ?? 0

  const selRect = {
    x: Math.min(startX, boxSelect.value.x2),
    y: Math.min(startY, boxSelect.value.y2),
    w: Math.abs(boxSelect.value.x2 - startX),
    h: Math.abs(boxSelect.value.y2 - startY),
  }

  if (selRect.w > 3 || selRect.h > 3) {
    const ids = components.value
      .filter((c) => !isComponentLocked(c) && rectsIntersect({ x: c.x, y: c.y, w: c.w, h: c.h }, selRect))
      .map((c) => c.id)
    store.selectComponents(ids)
  } else {
    store.selectComponent(null)
  }
  pointerDownPos.value = null
  boxSelect.value = null
}

// 与 React 版 dnd-kit PointerSensor activationConstraint.distance 对齐，避免 pointer capture 吞掉 dblclick（文本框内联编辑）
const DRAG_ACTIVATION_PX = 5

// canvas drag-to-move（transform 预览，pointerup 一次提交）
interface DragState {
  compId: string
  startX: number
  startY: number
  origX: number
  origY: number
  isMultiDrag: boolean
}

interface PendingDrag extends DragState {
  pointerId: number
  captureEl: HTMLElement
}

const pendingDrag = ref<PendingDrag | null>(null)
const dragState = ref<DragState | null>(null)

type DragListenerBundle = {
  onMove: (ev: PointerEvent) => void
  onUp: (ev: PointerEvent) => void
  onCancel: (ev: PointerEvent) => void
}

let dragListeners: DragListenerBundle | null = null

function endDragSession() {
  if (dragListeners) {
    window.removeEventListener('pointermove', dragListeners.onMove)
    window.removeEventListener('pointerup', dragListeners.onUp)
    window.removeEventListener('pointercancel', dragListeners.onCancel)
    dragListeners = null
  }
  pendingDrag.value = null
  dragState.value = null
  store.setGroupDragOffset(null)
  document.body.style.cursor = ''
}

function tryActivateDrag(ev: PointerEvent): boolean {
  const pending = pendingDrag.value
  if (!pending || dragState.value) return !!dragState.value
  const dx = ev.clientX - pending.startX
  const dy = ev.clientY - pending.startY
  if (Math.hypot(dx, dy) < DRAG_ACTIVATION_PX) return false

  dragState.value = {
    compId: pending.compId,
    startX: pending.startX,
    startY: pending.startY,
    origX: pending.origX,
    origY: pending.origY,
    isMultiDrag: pending.isMultiDrag,
  }
  pendingDrag.value = null
  store.setGroupDragOffset({ dx: 0, dy: 0 })
  document.body.style.cursor = 'grabbing'
  pending.captureEl.setPointerCapture?.(pending.pointerId)
  return true
}

function handleCompPointerDown(e: PointerEvent, domComp: PageComponent) {
  if (pageReadOnly.value) return
  if (editingCompId.value) return
  if (e.button !== 0) return
  if (isComponentLocked(domComp)) return
  e.stopPropagation()

  endDragSession()

  const pt = clientToCanvas(e)
  if (!pt) return

  const target = resolvePointerTarget(domComp, pt.x, pt.y)
  if (isComponentLocked(target)) return

  if (e.shiftKey || e.ctrlKey || e.metaKey) {
    store.selectComponent(target.id, true)
  } else if (!selectedIds.value.includes(target.id)) {
    store.selectComponent(target.id)
  }

  const isMultiDrag = selectedIds.value.includes(target.id) && selectedIds.value.length > 1

  const captureEl = e.currentTarget as HTMLElement
  pendingDrag.value = {
    compId: target.id,
    startX: e.clientX,
    startY: e.clientY,
    origX: isMultiDrag ? 0 : target.x,
    origY: isMultiDrag ? 0 : target.y,
    isMultiDrag,
    pointerId: e.pointerId,
    captureEl,
  }

  function onMove(ev: PointerEvent) {
    tryActivateDrag(ev)
    if (!dragState.value) return
    const scale = canvasScale.value
    const dx = (ev.clientX - dragState.value.startX) / scale
    const dy = (ev.clientY - dragState.value.startY) / scale
    store.setGroupDragOffset({ dx, dy })
  }

  function onUp(ev: PointerEvent) {
    if (!dragState.value) {
      endDragSession()
      return
    }
    const state = dragState.value
    const scale = canvasScale.value
    const dx = (ev.clientX - state.startX) / scale
    const dy = (ev.clientY - state.startY) / scale

    if (dx !== 0 || dy !== 0) {
      if (state.isMultiDrag) {
        store.moveComponents([...selectedIds.value], dx, dy)
      } else {
        store.moveComponent(
          state.compId,
          Math.round(state.origX + dx),
          Math.round(state.origY + dy),
        )
      }
    }

    captureEl.releasePointerCapture?.(ev.pointerId)
    endDragSession()
  }

  function onCancel(ev: PointerEvent) {
    if (dragState.value) {
      captureEl.releasePointerCapture?.(ev.pointerId)
    }
    endDragSession()
  }

  dragListeners = { onMove, onUp, onCancel }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onCancel)
}

function handleCompContextMenu(e: MouseEvent, compId: string) {
  const comp = components.value.find((c) => c.id === compId)
  if (!comp || isComponentLocked(comp)) return
  e.preventDefault()
  e.stopPropagation()
  if (!selectedIds.value.includes(compId)) {
    store.selectComponent(compId)
  }
  emit('contextmenu', e, compId)
}

function handleUnlockClick(e: MouseEvent, compId: string) {
  e.stopPropagation()
  store.setComponentLocked(compId, false)
  store.selectComponent(compId)
}

// Panel → Canvas drop (HTML5 DnD)
// dragover/dragenter 阶段 getData() 为空（浏览器限制），只能用 types 判断
const PANEL_DRAG_MIME = 'application/x-mvp-component-type'

function dataTransferHasType(dt: DataTransfer, type: string): boolean {
  return Array.from(dt.types).includes(type)
}

function isPanelComponentDrag(dt: DataTransfer): boolean {
  return dataTransferHasType(dt, PANEL_DRAG_MIME) || dataTransferHasType(dt, 'text/plain')
}

function handlePanelDragEnterOrOver(e: DragEvent) {
  if (pageReadOnly.value) return
  const dt = e.dataTransfer
  if (!dt || !isPanelComponentDrag(dt)) return
  e.preventDefault()
  dt.dropEffect = 'copy'
}

function handleDrop(e: DragEvent) {
  if (pageReadOnly.value) return
  e.preventDefault()
  const dt = e.dataTransfer
  if (!dt) return
  const customType = dt.getData('application/x-mvp-component-type')
  const plainType = dt.getData('text/plain')
  const type = (customType || plainType) as ComponentType | ''
  if (!type || !getEditorDef(type as ComponentType)) return
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const x = Math.round((e.clientX - rect.left) / canvasScale.value)
  const y = Math.round((e.clientY - rect.top) / canvasScale.value)
  store.addComponent(type, x, y)
}

function handleWheel(e: WheelEvent) {
  if (!e.ctrlKey && !e.metaKey) return
  e.preventDefault()
  if (e.deltaY < 0) store.zoomIn()
  else store.zoomOut()
}

// --- grab-pan handlers ---
function handlePanStart(e: PointerEvent) {
  if (!e.ctrlKey && !e.metaKey) return
  e.stopPropagation()
  e.preventDefault()
  const container = containerRef.value
  if (!container) return
  panState.value = {
    startX: e.clientX,
    startY: e.clientY,
    scrollLeft: container.scrollLeft,
    scrollTop: container.scrollTop,
  }
  container.setPointerCapture(e.pointerId)
}

function handlePanMove(e: PointerEvent) {
  if (!panState.value) return
  const container = containerRef.value
  if (!container) return
  container.scrollLeft = panState.value.scrollLeft - (e.clientX - panState.value.startX)
  container.scrollTop = panState.value.scrollTop - (e.clientY - panState.value.startY)
}

function handlePanEnd(e: PointerEvent) {
  if (!panState.value) return
  containerRef.value?.releasePointerCapture?.(e.pointerId)
  panState.value = null
}

function onCtrlKeyDown(e: KeyboardEvent) {
  if (e.key === 'Control' || e.key === 'Meta') ctrlHeld.value = true
}
function onCtrlKeyUp(e: KeyboardEvent) {
  if (e.key === 'Control' || e.key === 'Meta') ctrlHeld.value = false
}
</script>

<template>
  <div
    ref="containerRef"
    class="canvas-zoom-container editor-scrollbar relative min-w-0 flex-1 overflow-auto flex p-4"
    :class="{ '!cursor-grab': ctrlHeld && !panState, '!cursor-grabbing': !!panState }"
    @pointerdown.capture="handlePanStart"
    @pointermove="handlePanMove"
    @pointerup="handlePanEnd"
    @pointercancel="handlePanEnd"
    @dragenter="handlePanelDragEnterOrOver"
    @dragover="handlePanelDragEnterOrOver"
    @drop="handleDrop"
    @wheel="handleWheel"
  >
    <div
      ref="wrapperRef"
      class="relative shrink-0 m-auto"
      :style="{ width: `${pageWidth * canvasScale}px`, height: `${pageHeight * canvasScale}px` }"
    >
      <div
        ref="canvasRef"
        class="dnd-canvas border-2 border-slate-400/50 shadow-[0_0_16px_rgba(148,163,184,0.25)]"
        :style="{
          width: `${pageWidth}px`,
          height: `${pageHeight}px`,
          transformOrigin: '0 0',
          transform: `scale(${canvasScale})`,
          position: 'absolute',
          top: 0,
          left: 0,
          overflow: 'hidden',
          background: buildGradientBackground(bgColor, bgGradient, bgColorTo),
          touchAction: 'none',
        }"
        @pointerdown="handlePointerDown"
        @pointermove="handlePointerMove"
        @pointerup="handlePointerUp"
      >
        <!-- bg image -->
        <img
          v-if="bgImage"
          :src="bgImage"
          class="absolute inset-0 pointer-events-none select-none"
          :style="{ width: `${pageWidth}px`, height: `${pageHeight}px`, opacity: bgOpacity, objectFit: 'fill' }"
          draggable="false"
          alt=""
        />

        <!-- grid -->
        <div
          v-if="showGrid"
          data-grid="true"
          class="pointer-events-none absolute inset-0"
          :style="{
            backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.3) 1.5px, transparent 1.5px)',
            backgroundSize: '32px 32px',
            backgroundPosition: '0 0',
          }"
        />

        <!-- components -->
        <div
          v-for="comp in displayComponents"
          :key="`${comp.id}-${comp.type}`"
          :class="{ 'pointer-events-none': comp.locked }"
          :style="{
            position: 'absolute',
            left: `${comp.x}px`,
            top: `${comp.y}px`,
            width: `${comp.w}px`,
            height: `${comp.h}px`,
            cursor: comp.locked ? 'default' : (editingCompId === comp.id ? 'text' : 'grab'),
            overflow: 'visible',
            ...(groupDragOffset && isSelected(comp.id)
              ? { transform: `translate3d(${groupDragOffset.dx}px, ${groupDragOffset.dy}px, 0)` }
              : {}),
          }"
          @pointerdown="(e) => handleCompPointerDown(e, comp)"
          @contextmenu="(e) => handleCompContextMenu(e, comp.id)"
        >
          <ComponentPreview
            :comp="comp"
            :update-props="(patch: Record<string, unknown>) => store.updateComponentProps(comp.id, patch)"
            :is-editing="editingCompId === comp.id"
            :on-start-edit="() => editingCompId = comp.id"
            :on-end-edit="() => editingCompId = null"
          />

          <!-- component position -->
          <span
            v-if="props.showComponentPosition"
            class="absolute top-0 left-0 text-[10px] text-yellow-400 bg-black/60 px-1 rounded pointer-events-none select-none"
            style="transform: translateY(-100%)"
          >
            ({{ comp.x }},{{ comp.y }})
          </span>

          <!-- component boundary (always visible) -->
          <div
            class="absolute inset-0 pointer-events-none"
            :class="comp.locked
              ? 'border-[2px] border-dashed border-amber-400/60'
              : (isSelected(comp.id)
                ? (isOnlySelected(comp.id)
                  ? 'border-[4px] border-blue-400 ring-[3px] ring-blue-500/30 shadow-[0_0_20px_rgba(96,165,250,0.55),0_0_6px_rgba(59,130,246,0.7)]'
                  : 'border-[4px] border-cyan-400 ring-[3px] ring-cyan-500/25 shadow-[0_0_15px_rgba(34,211,238,0.4)]')
                : 'border-[2px] border-dashed border-slate-400/45')"
          />
          <ResizeHandles v-if="!pageReadOnly && isSelected(comp.id) && isOnlySelected(comp.id) && !comp.locked" :comp="comp" :canvas-scale="canvasScale" />

          <!-- lock badge -->
          <div
            v-if="comp.locked"
            class="absolute top-0 left-0 z-30 pointer-events-auto select-none -translate-x-1/3 -translate-y-1/3"
            title="点击解锁"
            @click="(e) => handleUnlockClick(e, comp.id)"
          >
            <div class="flex items-center justify-center w-[22px] h-[22px] rounded-full bg-slate-950/92 border-2 border-amber-400 shadow-[0_1px_6px_rgba(0,0,0,0.65),0_0_10px_rgba(251,191,36,0.4)] cursor-pointer hover:border-amber-300">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
          </div>

          <!-- data source badge -->
          <div
            v-if="comp.dataSourceId"
            class="absolute top-0 right-0 z-30 pointer-events-none select-none translate-x-1/3 -translate-y-1/3"
          >
            <div class="flex items-center justify-center w-[22px] h-[22px] rounded-full bg-slate-950/92 border-2 border-yellow-400 shadow-[0_1px_6px_rgba(0,0,0,0.65),0_0_10px_rgba(250,204,21,0.4)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fde047" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-yellow-300">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
          </div>
        </div>

        <!-- box select rect -->
        <div
          v-if="boxSelect"
          class="absolute border border-indigo-400 bg-indigo-500/10 pointer-events-none z-50"
          :style="{
            left: `${Math.min(boxSelect.x1, boxSelect.x2)}px`,
            top: `${Math.min(boxSelect.y1, boxSelect.y2)}px`,
            width: `${Math.abs(boxSelect.x2 - boxSelect.x1)}px`,
            height: `${Math.abs(boxSelect.y2 - boxSelect.y1)}px`,
          }"
        />
      </div>
    </div>
  </div>
</template>
