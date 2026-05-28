<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import type { PageComponent, ComponentType } from '@mvp-vue/schema'
import { useEditorStore } from '../stores/editorStore'
import { storeToRefs } from 'pinia'
import ResizeHandles from './ResizeHandles.vue'
import ComponentPreview from './canvas/ComponentPreview.vue'
import { getEditorDef } from './registry/registry'

const emit = defineEmits<{
  contextmenu: [e: MouseEvent, compId: string]
}>()

const store = useEditorStore()
const { components, pageWidth, pageHeight, bgColor, bgGradient, bgImage, bgOpacity, selectedIds, groupDragOffset } = storeToRefs(store)

const props = defineProps<{ showGrid: boolean }>()

const canvasScale = ref(0.5)
const wrapperRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLDivElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

const editingCompId = ref<string | null>(null)

interface BoxRect { x1: number; y1: number; x2: number; y2: number }
const boxSelect = ref<BoxRect | null>(null)
const pointerDownPos = ref<{ x: number; y: number } | null>(null)

function rectsIntersect(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y)
}

function buildBgStyle(color: string, gradient: string): string {
  switch (gradient) {
    case 'linear-top': return `linear-gradient(180deg, ${color}, rgba(0,0,0,0.35))`
    case 'linear-left': return `linear-gradient(90deg, ${color}, rgba(0,0,0,0.35))`
    case 'linear-diagonal': return `linear-gradient(135deg, ${color}, rgba(0,0,0,0.4))`
    case 'radial': return `radial-gradient(circle at 50% 50%, ${color}, rgba(0,0,0,0.45))`
    default: return color
  }
}

function updateScale() {
  const container = containerRef.value
  const wrapper = wrapperRef.value
  if (!container || !wrapper) return
  const cw = container.clientWidth - 32
  const ch = container.clientHeight - 32
  const scale = Math.min(cw / pageWidth.value, ch / pageHeight.value, 1)
  canvasScale.value = scale
  wrapper.style.width = `${pageWidth.value * scale}px`
  wrapper.style.height = `${pageHeight.value * scale}px`
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  updateScale()
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(updateScale)
    resizeObserver.observe(containerRef.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

watch([pageWidth, pageHeight], updateScale)

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
      .filter((c) => rectsIntersect({ x: c.x, y: c.y, w: c.w, h: c.h }, selRect))
      .map((c) => c.id)
    store.selectComponents(ids)
  } else {
    store.selectComponent(null)
  }
  pointerDownPos.value = null
  boxSelect.value = null
}

// canvas drag-to-move (single component)
interface DragState {
  compId: string
  startX: number
  startY: number
  origX: number
  origY: number
  isMultiDrag: boolean
}

const dragState = ref<DragState | null>(null)

function handleCompPointerDown(e: PointerEvent, comp: PageComponent) {
  if (editingCompId.value) return
  // 右键会先触发 pointerdown；忽略非主键，避免破坏多选或误开拖拽
  if (e.button !== 0) return
  e.stopPropagation()

  if (e.shiftKey) {
    store.selectComponent(comp.id, true)
  } else if (!isOnlySelected(comp.id)) {
    // 普通点击组件时，收敛到单选，避免多选态下误触发群组拖拽
    store.selectComponent(comp.id)
  }

  const scale = canvasScale.value

  const multiIds = selectedIds.value.includes(comp.id) && selectedIds.value.length > 1
  if (multiIds) {
    dragState.value = {
      compId: comp.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: 0,
      origY: 0,
      isMultiDrag: true,
    }
  } else {
    dragState.value = {
      compId: comp.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: comp.x,
      origY: comp.y,
      isMultiDrag: false,
    }
  }

  function onMove(ev: PointerEvent) {
    if (!dragState.value) return
    const dx = (ev.clientX - dragState.value.startX) / scale
    const dy = (ev.clientY - dragState.value.startY) / scale
    if (dragState.value.isMultiDrag) {
      store.setGroupDragOffset({ dx, dy })
    } else {
      store.resizeComponent(
        comp.id,
        Math.round(dragState.value.origX + dx),
        Math.round(dragState.value.origY + dy),
        comp.w,
        comp.h,
      )
    }
  }

  function onUp() {
    if (!dragState.value) return
    if (dragState.value.isMultiDrag) {
      const offset = groupDragOffset.value
      if (offset) {
        store.moveComponents([...selectedIds.value], offset.dx, offset.dy)
      }
      store.setGroupDragOffset(null)
    }
    dragState.value = null
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

function handleCompContextMenu(e: MouseEvent, compId: string) {
  e.preventDefault()
  e.stopPropagation()
  if (!selectedIds.value.includes(compId)) {
    store.selectComponent(compId)
  }
  emit('contextmenu', e, compId)
}

// Panel → Canvas drop (HTML5 DnD)
function handleDragOver(e: DragEvent) {
  const dt = e.dataTransfer
  if (!dt) return
  const customType = dt.getData('application/x-mvp-component-type')
  const plainType = dt.getData('text/plain')
  const dragType = customType || plainType
  if (!dragType || !getEditorDef(dragType as ComponentType)) return
  e.preventDefault()
  dt.dropEffect = 'copy'
}

function handleDrop(e: DragEvent) {
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
</script>

<template>
  <div ref="containerRef" class="relative min-w-0 flex-1 flex items-center justify-center overflow-hidden p-4" @dragover="handleDragOver" @drop="handleDrop">
    <div ref="wrapperRef" class="relative shrink-0 overflow-visible">
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
          background: buildBgStyle(bgColor, bgGradient),
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
          v-for="comp in components"
          :key="`${comp.id}-${comp.type}`"
          :style="{
            position: 'absolute',
            left: `${comp.x}px`,
            top: `${comp.y}px`,
            width: `${comp.w}px`,
            height: `${comp.h}px`,
            cursor: editingCompId === comp.id ? 'text' : 'grab',
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

          <!-- debug coords -->
          <span
            class="absolute top-0 left-0 text-[10px] text-yellow-400 bg-black/60 px-1 rounded pointer-events-none select-none"
            style="transform: translateY(-100%)"
          >
            ({{ comp.x }},{{ comp.y }})
          </span>

          <!-- component boundary (always visible) -->
          <div
            class="absolute inset-0 pointer-events-none"
            :class="isSelected(comp.id)
              ? (isOnlySelected(comp.id)
                ? 'border-[4px] border-blue-400 ring-[3px] ring-blue-500/30 shadow-[0_0_20px_rgba(96,165,250,0.55),0_0_6px_rgba(59,130,246,0.7)]'
                : 'border-[4px] border-cyan-400 ring-[3px] ring-cyan-500/25 shadow-[0_0_15px_rgba(34,211,238,0.4)]')
              : 'border-[2px] border-dashed border-slate-400/45'"
          />
          <ResizeHandles v-if="isSelected(comp.id) && isOnlySelected(comp.id)" :comp="comp" :canvas-scale="canvasScale" />

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
