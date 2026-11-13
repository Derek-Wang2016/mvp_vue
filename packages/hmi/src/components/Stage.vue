<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { currentPage, LIMITS, type HmiButton, type HmiDocument, type HmiIconShape, type HmiImage, type HmiItem, type Selection } from '../types'
import { cardKey, shapeKey } from '../geometry'
import { paintSvg, resolveIcon } from '../icons/lvglSvg'
import { lvglSymbolName } from '../icons/lvglSymbols'
import { applyMask, fontPx, formatClock, lookupColor, paintColor, qrSide, sampleValue, textAlign, trackSizes } from '../resolve'
import { getApiBase } from '../config'
import QrPreview from './QrPreview.vue'

const props = defineProps<{
  doc: HmiDocument
  selection: Selection | null
  selectedKeys: string[]
  drag: { dx: number; dy: number } | null
  showPosition: boolean
}>()
const page = computed(() => currentPage(props.doc))
const emit = defineEmits<{
  select: [selection: Selection | null]
  targetDown: [event: PointerEvent, key: string]
  targetMenu: [event: MouseEvent, key: string]
}>()

const tick = ref(0)
let timer = 0
onMounted(() => { timer = window.setInterval(() => { tick.value += 1 }, 1000) })
onBeforeUnmount(() => window.clearInterval(timer))

const now = computed(() => props.doc.sample && tick.value)

function selectedShape(index: number) {
  return props.selectedKeys.includes(shapeKey(index))
}
function selectedCard(index: number) {
  return props.selectedKeys.includes(cardKey(index)) || (props.selection?.kind === 'item' && props.selection.card === index)
}
function symbolSize(shape: HmiButton): number {
  if (shape.font) return fontPx(shape.font)
  return Math.min(48, Math.max(8, shape.h - 16))
}

function buttonIcon(shape: HmiButton): string {
  const svg = resolveIcon(shape.icon, props.doc.library)
  if (!svg) return ''
  return paintSvg(svg, paintColor(shape.color, props.doc, '#FFFFFF'))
}

function shapeIcon(shape: HmiIconShape): string {
  if (shape.mode === 'static') {
    const svg = resolveIcon(shape.icon, props.doc.library)
    if (!svg) return ''
    return paintSvg(svg, paintColor(shape.color, props.doc, '#FFFFFF'))
  }
  const text = valueText(shape.prop)
  const svg = resolveIcon(props.doc.icons?.[text], props.doc.library)
  if (!svg) return ''
  return paintSvg(svg, lookupColor(props.doc.colors, text))
}

function selectedItem(card: number, index: number) {
  return props.selection?.kind === 'item' && props.selection.card === card && props.selection.index === index
}

function boxStyle(node: { x: number; y: number; w: number; h: number; bg?: string; radius?: number; border_w?: number; border_color?: string; shadow?: { width?: number; color?: string; ofs_x?: number; ofs_y?: number } }, circle = false) {
  const shadow = node.shadow
  const style: Record<string, string> = {
    position: 'absolute',
    left: `${node.x}px`,
    top: `${node.y}px`,
    width: `${node.w}px`,
    height: `${node.h}px`,
    background: paintColor(node.bg, props.doc) || 'transparent',
    borderRadius: circle ? '50%' : `${node.radius ?? 0}px`,
    boxSizing: 'border-box',
  }
  const border = paintColor(node.border_color, props.doc)
  if ((node.border_w ?? 0) > 0 && border) style.border = `${node.border_w}px solid ${border}`
  const shadowColor = paintColor(shadow?.color, props.doc, '#000')
  if ((shadow?.width ?? 0) > 0) style.boxShadow = `${shadow?.ofs_x ?? 0}px ${shadow?.ofs_y ?? 0}px ${shadow?.width}px ${shadowColor}`
  return style
}

function lineStyle(shape: { x1: number; y1: number; x2: number; y2: number; width?: number; color?: string }) {
  const dx = shape.x2 - shape.x1
  const dy = shape.y2 - shape.y1
  const length = Math.hypot(dx, dy) || 1
  const angle = Math.atan2(dy, dx) * 180 / Math.PI
  return {
    position: 'absolute' as const,
    left: `${shape.x1}px`,
    top: `${shape.y1}px`,
    width: `${length}px`,
    height: `${shape.width ?? 1}px`,
    background: paintColor(shape.color, props.doc, '#000'),
    transformOrigin: '0 50%',
    transform: `rotate(${angle}deg)`,
  }
}

function gridStyle(card: { w: number; h: number; cols?: number; rows?: number; gap?: number; col_w?: number[]; row_h?: number[] }) {
  const cols = Math.min(LIMITS.cols, Math.max(1, card.cols ?? (card.col_w?.length || 1)))
  const rows = Math.min(LIMITS.tracks, Math.max(1, card.rows ?? (card.row_h?.length || 1)))
  const gap = card.gap ?? 0
  return {
    display: 'grid',
    width: '100%',
    height: '100%',
    gap: `${gap}px`,
    gridTemplateColumns: trackSizes(card.w, cols, gap, card.col_w).map((n) => `${n}px`).join(' '),
    gridTemplateRows: trackSizes(card.h, rows, gap, card.row_h).map((n) => `${n}px`).join(' '),
  }
}

function cellStyle(item: { col?: number; row?: number; colspan?: number; rowspan?: number; align?: 'start' | 'center' | 'end'; pad_x?: number }) {
  return {
    gridColumn: `${(item.col ?? 0) + 1} / span ${item.colspan ?? 1}`,
    gridRow: `${(item.row ?? 0) + 1} / span ${item.rowspan ?? 1}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: item.align === 'start' ? 'flex-start' : item.align === 'end' ? 'flex-end' : 'center',
    paddingLeft: `${item.pad_x ?? 0}px`,
    minWidth: '0',
    overflow: 'hidden',
    outline: 'none',
  }
}

function fontStyle(item: { font?: string; bold?: number; color?: string; align?: 'start' | 'center' | 'end' }) {
  return {
    fontSize: `${fontPx(item.font)}px`,
    fontWeight: item.bold === 1 ? '700' : '400',
    color: paintColor(item.color, props.doc, '#222'),
    textAlign: textAlign(item.align),
    lineHeight: '1.15',
    width: '100%',
  }
}

function dragStyle(key: string, locked = false): Record<string, string> {
  if (locked || !props.drag || !props.selectedKeys.includes(key)) return {}
  return { transform: `translate(${props.drag.dx}px, ${props.drag.dy}px)` }
}
function onTarget(event: PointerEvent, key: string) {
  if (event.button !== 0) return
  event.preventDefault()
  event.stopPropagation()
  emit('targetDown', event, key)
}
function onItem(event: PointerEvent, cardIndex: number, itemIndex: number) {
  if (event.button !== 0) return
  event.stopPropagation()
  const startX = event.clientX
  const startY = event.clientY
  emit('targetDown', event, cardKey(cardIndex))
  const up = (ev: PointerEvent) => {
    window.removeEventListener('pointerup', up)
    if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 4 && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
      emit('select', { kind: 'item', card: cardIndex, index: itemIndex })
    }
  }
  window.addEventListener('pointerup', up)
}

function onMenu(event: MouseEvent, key: string) {
  event.preventDefault()
  event.stopPropagation()
  emit('targetMenu', event, key)
}

function linkShowsLast(text: string | undefined): boolean {
  const raw = text?.trim()
  if (!raw) return false
  try {
    const parsed = JSON.parse(raw) as { show_last_comm?: unknown }
    return parsed?.show_last_comm === true
  } catch {
    return false
  }
}

function imageMaskStyle(shape: HmiImage): Record<string, string> {
  const color = paintColor(shape.color, props.doc)
  if (!color) return {}
  const url = `url("${imageSrc(shape).replace(/"/g, '%22')}")`
  return {
    backgroundColor: color,
    WebkitMaskImage: url,
    maskImage: url,
    WebkitMaskSize: '100% 100%',
    maskSize: '100% 100%',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
  }
}
function imageOpacity(shape: HmiImage): number {
  const opa = shape.opa
  if (opa == null || !Number.isFinite(opa)) return 1
  return Math.max(0, Math.min(100, opa)) / 100
}
function mediaUrl(path: string | undefined) {
  const url = path?.trim()
  if (!url) return ''
  if (url.startsWith('/')) return `${getApiBase()}${url}`
  return url
}

/** 网页预览优先用 url。src / 图片路径留给设备端下载到本地。 */
function previewSrc(local: string | undefined, remote: string | undefined) {
  return mediaUrl(remote) || mediaUrl(local)
}

function imageSrc(shape: HmiImage) {
  return previewSrc(shape.src, shape.url)
}

function pageBgSrc() {
  return previewSrc(page.value.bgImage, page.value.bgUrl)
}

function valueText(prop: string | undefined, format?: string) {
  void now.value
  if (prop === 'CLOCK') return formatClock(new Date(), format)
  return String(sampleValue(props.doc, prop) ?? '')
}

function maskedValue(item: HmiItem) {
  const raw = valueText(item.prop, item.format)
  if (item.type !== 'value') return raw
  return applyMask(raw, item.mask, item.mask_at, item.mask_n)
}
</script>

<template>
  <div class="relative" :style="{ width: doc.screen.w + 'px', height: doc.screen.h + 'px' }">
    <div
      class="pointer-events-none absolute inset-0"
      :style="{ background: page.bg || '#0b1220', opacity: Math.max(0, Math.min(100, page.bgOpa ?? 100)) / 100 }"
    />
    <img
      v-if="pageBgSrc()"
      :src="pageBgSrc()"
      alt=""
      draggable="false"
      class="pointer-events-none absolute inset-0 h-full w-full object-fill"
      :style="{ opacity: Math.max(0, Math.min(100, page.bgOpa ?? 100)) / 100 }"
    />
    <template v-for="(shape, index) in page.shapes" :key="'s' + index">
      <div
        v-if="shape.type === 'line'"
        data-node
        :style="{ ...lineStyle(shape), ...dragStyle(shapeKey(index), !!shape.locked), outline: selectedShape(index) ? '1px solid #38bdf8' : 'none', cursor: shape.locked ? 'default' : 'grab' }"
        @pointerdown="onTarget($event, shapeKey(index))"
        @contextmenu="onMenu($event, shapeKey(index))"
      />
      <img
        v-else-if="shape.type === 'image' && !paintColor(shape.color, doc)"
        :src="imageSrc(shape)"
        draggable="false"
        @dragstart.prevent
        alt=""
        data-node
        :style="{ ...boxStyle(shape), objectFit: 'fill', opacity: imageOpacity(shape), ...dragStyle(shapeKey(index), !!shape.locked), outline: selectedShape(index) ? '2px solid #38bdf8' : 'none', cursor: shape.locked ? 'default' : 'grab' }"
        @pointerdown="onTarget($event, shapeKey(index))"
        @contextmenu="onMenu($event, shapeKey(index))"
      />
      <div
        v-else-if="shape.type === 'image'"
        data-node
        :style="{ ...boxStyle(shape), ...imageMaskStyle(shape), opacity: imageOpacity(shape), ...dragStyle(shapeKey(index), !!shape.locked), outline: selectedShape(index) ? '2px solid #38bdf8' : 'none', cursor: shape.locked ? 'default' : 'grab' }"
        @pointerdown="onTarget($event, shapeKey(index))"
        @contextmenu="onMenu($event, shapeKey(index))"
      />
      <div
        v-else-if="shape.type === 'block'"
        data-node
        class="flex flex-col items-center justify-center px-2"
        :style="{ ...boxStyle(shape), color: paintColor(shape.color, doc, '#222222'), fontSize: fontPx(shape.font) + 'px', ...dragStyle(shapeKey(index), !!shape.locked), outline: selectedShape(index) ? '2px solid #38bdf8' : 'none', cursor: shape.locked ? 'default' : 'grab' }"
        @pointerdown="onTarget($event, shapeKey(index))"
        @contextmenu="onMenu($event, shapeKey(index))"
      >
        <span class="truncate font-semibold">{{ shape.key || '功能块' }}</span>
        <span v-if="(shape.key ?? '').trim().toUpperCase() === 'LINK' && linkShowsLast(shape.params)" class="mt-1 truncate text-[0.7em] opacity-80">上次通信 14:32</span>
      </div>
      <div
        v-else-if="shape.type === 'button'"
        data-node
        class="flex items-center justify-center gap-1 px-2"
        :class="shape.icon_pos === 'right' ? 'flex-row-reverse' : shape.icon_pos === 'top' ? 'flex-col' : shape.icon_pos === 'bottom' ? 'flex-col-reverse' : 'flex-row'"
        :style="{ ...boxStyle(shape), color: paintColor(shape.color, doc, '#FFFFFF'), fontSize: fontPx(shape.font) + 'px', ...dragStyle(shapeKey(index), !!shape.locked), outline: selectedShape(index) ? '2px solid #38bdf8' : 'none', cursor: shape.locked ? 'default' : 'grab' }"
        @pointerdown="onTarget($event, shapeKey(index))"
        @contextmenu="onMenu($event, shapeKey(index))"
      >
        <span class="flex shrink-0 items-center justify-center gap-1">
          <span
            v-if="lvglSymbolName(shape.symbol)"
            class="flex items-center justify-center overflow-hidden font-semibold leading-none"
            :style="{ width: symbolSize(shape) + 'px', height: symbolSize(shape) + 'px', fontSize: Math.max(8, symbolSize(shape) * 0.32) + 'px' }"
          >{{ lvglSymbolName(shape.symbol) }}</span>
          <span v-if="buttonIcon(shape)" class="h-6 w-6 [&>svg]:h-full [&>svg]:w-full" v-html="buttonIcon(shape)" />
        </span>
        <span class="truncate">{{ shape.text }}</span>
      </div>
      <div
        v-else-if="shape.type === 'icon'"
        data-node
        class="[&>svg]:h-full [&>svg]:w-full"
        :style="{ ...boxStyle(shape), ...dragStyle(shapeKey(index), !!shape.locked), outline: selectedShape(index) ? '2px solid #38bdf8' : 'none', cursor: shape.locked ? 'default' : 'grab' }"
        v-html="shapeIcon(shape)"
        @pointerdown="onTarget($event, shapeKey(index))"
        @contextmenu="onMenu($event, shapeKey(index))"
      />
      <div
        v-else
        data-node
        :style="{ ...boxStyle(shape, shape.type === 'circle'), ...dragStyle(shapeKey(index), !!shape.locked), outline: selectedShape(index) ? '2px solid #38bdf8' : 'none', cursor: shape.locked ? 'default' : 'grab' }"
        @pointerdown="onTarget($event, shapeKey(index))"
        @contextmenu="onMenu($event, shapeKey(index))"
      />
    </template>

    <div
      v-for="(card, cardIndex) in page.cards"
      :key="'c' + cardIndex"
      data-node
      :style="{ ...boxStyle(card), ...dragStyle(cardKey(cardIndex), !!card.locked), outline: selectedCard(cardIndex) ? '2px solid #38bdf8' : 'none', cursor: card.locked ? 'default' : 'grab' }"
      @pointerdown="onTarget($event, cardKey(cardIndex))"
      @contextmenu="onMenu($event, cardKey(cardIndex))"
    >
      <div :style="gridStyle(card)" class="h-full w-full">
        <div
          v-for="(item, itemIndex) in card.items"
          :key="itemIndex"
          :style="{ ...cellStyle(item), outline: selectedItem(cardIndex, itemIndex) ? '1px dashed #0284c7' : 'none' }"
          @pointerdown.stop="onItem($event, cardIndex, itemIndex)"
        >
          <span v-if="item.type === 'label'" :style="fontStyle(item)">{{ item.text }}</span>
          <span v-else-if="item.type === 'value'" class="flex w-full min-w-0 items-center" :style="{ gap: item.title ? `${item.gap ?? 0}px` : '0' }">
            <span v-if="item.title" class="shrink-0 whitespace-nowrap" :style="{ fontSize: fontPx(item.title_font) + 'px', color: paintColor(item.title_color, doc, '#222') }">{{ item.title }}</span>
            <span :style="fontStyle(item)">{{ maskedValue(item) }}</span>
          </span>
          <div v-else-if="item.type === 'qrcode' && valueText(item.prop)" class="flex items-center justify-center">
            <QrPreview :text="valueText(item.prop)" :size="qrSide(card, item)" />
          </div>
          <div
            v-else-if="item.type === 'split'"
            class="flex h-full w-full"
            :class="item.flow === 'row' ? 'flex-row items-stretch' : 'flex-col'"
            :style="{ gap: `${item.gap ?? 8}px`, alignSelf: 'stretch' }"
          >
            <div
              v-for="part in valueText(item.prop).split(item.split?.[0] || ',').map(s => s.trim()).filter(Boolean)"
              :key="part"
              class="flex"
              :style="{
                ...fontStyle(item),
                background: lookupColor(doc.colors, part, paintColor(item.default_color, doc, '#7C7C7C')),
                alignItems: 'center',
                justifyContent: item.align === 'start' ? 'flex-start' : item.align === 'end' ? 'flex-end' : 'center',
                ...(item.flow === 'row'
                  ? { flexDirection: 'column', width: `${item.item_h ?? 73}px`, maxWidth: `${item.item_h ?? 73}px`, height: '100%', flex: 'none' }
                  : { height: `${item.item_h ?? 73}px`, width: '100%' }),
              }"
            >{{ part }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
