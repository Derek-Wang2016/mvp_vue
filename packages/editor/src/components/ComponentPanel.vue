<script setup lang="ts">
import type { ComponentType } from '@mvp-vue/schema'
import { useEditorStore } from '../stores/editorStore'
import { storeToRefs } from 'pinia'

const store = useEditorStore()
const { pageReadOnly } = storeToRefs(store)

const PANEL_ITEMS: { type: ComponentType; label: string }[] = [
  { type: 'text', label: '文本' },
  { type: 'image', label: '图片' },
  { type: 'icon', label: '图标' },
  { type: 'rectangle', label: '矩形' },
  { type: 'ellipse', label: '圆形/椭圆' },
  { type: 'line', label: '线条' },
  { type: 'bar-chart', label: '柱状图' },
  { type: 'line-chart', label: '折线图' },
  { type: 'pie-chart', label: '饼图' },
  { type: 'table', label: '表格' },
  { type: 'datetime', label: '日期时间' },
  { type: 'analog-clock', label: '表盘时钟' },
  { type: 'page-nav-button', label: '页面跳转按钮' },
  { type: 'card-list', label: '卡片列表' },
  { type: 'card', label: '卡片' },
  { type: 'key-value-tag', label: '键值标签' },
  { type: 'map', label: '地图' },
]

const ICONS: Record<string, string> = {
  text: 'T',
  image: '🖼',
  icon: '◇',
  rectangle: '▭',
  line: '╱',
  'bar-chart': '📊',
  'line-chart': '📈',
  'pie-chart': '🥧',
  table: '⊞',
  datetime: '🕐',
  'analog-clock': '🕰',
  'page-nav-button': '➜',
  'card-list': '▦',
  card: '▣',
  'key-value-tag': '▤',
  map: '🗺',
}
</script>

<template>
  <aside
    class="w-48 border-r border-white/10 p-3 bg-[#0f1824] flex flex-col"
    :class="pageReadOnly ? 'opacity-60' : ''"
  >
    <h2 class="text-[10px] text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
      <span class="text-indigo-400 text-[8px]">◆</span>
      组件列表
    </h2>
    <div class="space-y-1.5">
      <div
        v-for="item in PANEL_ITEMS"
        :key="item.type"
        :draggable="!pageReadOnly"
        class="h-8 bg-white/[0.03] border border-white/[0.06] hover:border-white/10 hover:bg-white/[0.06] rounded-md flex items-center gap-2 px-2.5 text-xs transition-colors select-none"
        :class="pageReadOnly ? 'cursor-not-allowed opacity-50' : 'cursor-grab active:cursor-grabbing'"
        data-draggable="panel"
        :data-drag-type="item.type"
        @dragstart="(e: DragEvent) => { e.dataTransfer!.effectAllowed = 'copy'; e.dataTransfer!.setData('application/x-mvp-component-type', item.type); e.dataTransfer!.setData('text/plain', item.type); }"
      >
        <span
          v-if="item.type === 'ellipse'"
          class="w-4 h-4 flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <span class="w-3.5 h-3.5 rounded-full border-[1.5px] border-slate-400" />
        </span>
        <span v-else class="text-slate-500 text-xs w-4 text-center">{{ ICONS[item.type] }}</span>
        <span class="text-slate-400">{{ item.label }}</span>
      </div>
    </div>
  </aside>
</template>
