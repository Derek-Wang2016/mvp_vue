<script setup lang="ts">
import type { HmiCard, HmiShape, Selection } from '../types'

defineProps<{ shapes: HmiShape[]; cards: HmiCard[]; selection: Selection | null }>()
const emit = defineEmits<{ select: [selection: Selection] }>()

function shapeLabel(shape: HmiShape, index: number) {
  if (shape.type === 'line') return `${shape.locked ? '锁 ' : ''}线 ${index + 1}`
  if (shape.type === 'image') return `${shape.locked ? '锁 ' : ''}${shape.url || shape.src || '图片'}`
  if (shape.type === 'icon') return `${shape.locked ? '锁 ' : ''}图标 ${shape.mode === 'static' ? (shape.icon || '静态') : (shape.prop || '')}`
  if (shape.type === 'button') return `${shape.locked ? '锁 ' : ''}按钮 ${shape.text || (shape.action === 'function' ? shape.key : shape.page) || ''}`
  if (shape.type === 'block') return `${shape.locked ? '锁 ' : ''}功能块 ${shape.key || ''}`
  return `${shape.locked ? '锁 ' : ''}${shape.type === 'circle' ? '圆' : '矩形'} ${shape.w}×${shape.h}`
}

function itemLabel(item: HmiCard['items'][number]) {
  if (item.type === 'label') return item.text || '标题'
  return item.prop || item.type
}

function on(kind: Selection) {
  return kind
}
</script>

<template>
  <div class="space-y-3 text-sm">
    <section>
      <div class="mb-1 text-slate-500">形状</div>
      <button
        v-for="(shape, index) in shapes"
        :key="'s' + index"
        type="button"
        class="block w-full truncate rounded px-2 py-1 text-left"
        :class="selection?.kind === 'shape' && selection.index === index ? 'bg-sky-900' : 'hover:bg-slate-800'"
        @click="emit('select', on({ kind: 'shape', index }))"
      >{{ shapeLabel(shape, index) }}</button>
    </section>
    <section>
      <div class="mb-1 text-slate-500">卡片</div>
      <div v-for="(card, cardIndex) in cards" :key="'c' + cardIndex" class="mb-1">
        <button
          type="button"
          class="block w-full truncate rounded px-2 py-1 text-left"
          :class="selection?.kind === 'card' && selection.index === cardIndex ? 'bg-sky-900' : 'hover:bg-slate-800'"
          @click="emit('select', on({ kind: 'card', index: cardIndex }))"
        >{{ card.locked ? '锁 ' : '' }}{{ card.x }},{{ card.y }} {{ card.w }}×{{ card.h }}</button>
        <button
          v-for="(item, itemIndex) in card.items"
          :key="itemIndex"
          type="button"
          class="block w-full truncate rounded py-0.5 pl-4 text-left text-slate-300"
          :class="selection?.kind === 'item' && selection.card === cardIndex && selection.index === itemIndex ? 'bg-sky-950' : 'hover:bg-slate-800'"
          @click="emit('select', on({ kind: 'item', card: cardIndex, index: itemIndex }))"
        ><span class="mr-1 text-slate-500">{{ item.type }}</span>{{ itemLabel(item) }}</button>
      </div>
    </section>
  </div>
</template>
