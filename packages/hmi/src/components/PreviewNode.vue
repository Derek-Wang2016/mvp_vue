<script setup lang="ts">
import { computed } from 'vue'
import type { HmiDocument, HmiNode } from '../types'
import { colorOf, displayText, fontPx, sampleValue } from '../resolve'

const props = defineProps<{
  node: HmiNode
  doc: HmiDocument
  path: number[]
  selected: number[]
}>()

const emit = defineEmits<{ select: [path: number[]] }>()

const active = computed(() => props.path.join('.') === props.selected.join('.') && props.path.length > 0)

const box = computed(() => {
  const n = props.node
  const layout = n.layout
  const shadow = n.shadow
  const border = n.border
  const style: Record<string, string> = {
    boxSizing: 'border-box',
    position: 'relative',
    flex: '0 0 auto',
    overflow: 'hidden',
    background: colorOf(props.doc.colors, n.bg_color, 'transparent'),
    borderRadius: `${n.radius ?? 0}px`,
    color: colorOf(props.doc.colors, n.value_color, '#222'),
    outline: active.value ? '2px solid #38bdf8' : 'none',
    outlineOffset: '-2px',
  }
  if (n.size?.w) style.width = `${n.size.w}px`
  if (n.size?.h) style.height = `${n.size.h}px`
  const pad = n.pad ?? 0
  style.paddingTop = `${n.pad_y ?? pad}px`
  style.paddingBottom = `${n.pad_y ?? pad}px`
  style.paddingLeft = `${n.pad_left ?? n.pad_x ?? pad}px`
  style.paddingRight = `${n.pad_right ?? n.pad_x ?? pad}px`
  if (n.text_ofs_y) style.paddingTop = `${(n.pad_y ?? pad) + n.text_ofs_y}px`
  if (layout) {
    style.display = 'flex'
    style.flexDirection = layout.flow === 'row' ? 'row' : 'column'
    style.justifyContent = alignCss(layout.align_main)
    style.alignItems = alignCss(layout.align_cross)
    const gap = layout.flow === 'row' ? layout.gap_col : layout.gap_row
    if (gap) style.gap = `${gap}px`
  }
  if (border?.width) {
    style.border = `${border.width}px solid ${colorOf(props.doc.colors, border.color, '#000')}`
  }
  if (shadow?.width) {
    style.boxShadow = `${shadow.ofs_x ?? 0}px ${shadow.ofs_y ?? 0}px ${shadow.width}px ${colorOf(props.doc.colors, shadow.color, '#000')}`
  }
  return style
})

const valueText = computed(() => displayText(props.doc, sampleValue(props.doc, props.node.prop)))

const splitItems = computed(() => {
  const raw = String(sampleValue(props.doc, props.node.prop) ?? '')
  const sep = props.node.split || ','
  return raw.split(sep).map((s) => s.trim()).filter(Boolean)
})

function alignCss(value: string | undefined) {
  if (value === 'end') return 'flex-end'
  if (value === 'center') return 'center'
  if (value === 'space-between') return 'space-between'
  if (value === 'stretch') return 'stretch'
  return 'flex-start'
}

function fontStyle(name: string | undefined, color: string | undefined, weight?: string) {
  return {
    fontSize: `${fontPx(props.doc.fonts, name)}px`,
    color: colorOf(props.doc.colors, color, 'inherit'),
    fontWeight: weight === 'bold' ? '700' : '400',
    lineHeight: '1.2',
    whiteSpace: 'pre-wrap' as const,
  }
}

function onClick(event: MouseEvent) {
  event.stopPropagation()
  emit('select', props.path)
}
</script>

<template>
  <div :style="box" @click="onClick">
    <template v-if="node.type === 'container'">
      <PreviewNode
        v-for="(child, index) in node.children ?? []"
        :key="index"
        :node="child"
        :doc="doc"
        :path="[...path, index]"
        :selected="selected"
        @select="emit('select', $event)"
      />
    </template>
    <template v-else-if="node.type === 'label'">
      <span :style="fontStyle(node.title_font, node.title_color, node.title_style)">{{ node.title }}</span>
    </template>
    <template v-else-if="node.type === 'value'">
      <span v-if="node.title" :style="fontStyle(node.title_font, node.title_color, node.title_style)">{{ node.title }}</span>
      <span :style="fontStyle(node.value_font, node.value_color, node.value_style)">{{ valueText }}</span>
    </template>
    <template v-else-if="node.type === 'qrcode'">
      <div class="flex h-full w-full flex-col items-center justify-center text-center text-xs text-slate-700">
        <div class="mb-1 grid grid-cols-5 gap-px">
          <span v-for="i in 25" :key="i" class="h-2 w-2" :class="(i * 7) % 3 ? 'bg-slate-900' : 'bg-white'" />
        </div>
        <span class="max-w-full truncate px-1">{{ valueText }}</span>
      </div>
    </template>
    <template v-else-if="node.type === 'split'">
      <div class="flex h-full w-full flex-col" :style="{ gap: `${node.gap ?? 0}px` }">
        <div
          v-for="item in splitItems"
          :key="item"
          class="flex items-center justify-center rounded"
          :style="{
            height: `${node.item_h ?? 40}px`,
            background: node.colors?.[item] || node.default_color || '#7C7C7C',
            ...fontStyle(node.value_font, node.value_color),
          }"
        >{{ displayText(doc, item) }}</div>
      </div>
    </template>
    <template v-else-if="node.type === 'image'">
      <img v-if="node.src" :src="node.src" alt="" class="h-full w-full object-contain" />
      <div v-else class="flex h-full w-full items-center justify-center text-xs text-slate-500">图片</div>
    </template>
  </div>
</template>
