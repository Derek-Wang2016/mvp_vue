<script setup lang="ts">
import type { ComponentType } from '@mvp-vue/schema'

const PANEL_ITEMS: { type: ComponentType; label: string }[] = [
  { type: 'text', label: '文本' },
  { type: 'image', label: '图片' },
  { type: 'bar-chart', label: '柱状图' },
  { type: 'line-chart', label: '折线图' },
  { type: 'pie-chart', label: '饼图' },
  { type: 'table', label: '表格' },
  { type: 'datetime', label: '日期时间' },
  { type: 'analog-clock', label: '表盘时钟' },
  { type: 'page-nav-button', label: '页面跳转按钮' },
  { type: 'card-list', label: '卡片列表' },
  { type: 'key-value-tag', label: '键值标签' },
  { type: 'map', label: '地图' },
]

const ICONS: Record<string, string> = {
  text: 'T',
  image: '🖼',
  'bar-chart': '📊',
  'line-chart': '📈',
  'pie-chart': '🥧',
  table: '⊞',
  datetime: '🕐',
  'analog-clock': '🕰',
  'page-nav-button': '➜',
  'card-list': '▦',
  'key-value-tag': '▤',
  map: '🗺',
}
</script>

<template>
  <aside class="w-48 border-r border-white/10 p-3 bg-[#0f1824] flex flex-col">
    <h2 class="text-[10px] text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
      <span class="text-indigo-400 text-[8px]">◆</span>
      组件列表
    </h2>
    <div class="space-y-1.5">
      <div
        v-for="item in PANEL_ITEMS"
        :key="item.type"
        draggable="true"
        class="h-8 bg-white/[0.03] border border-white/[0.06] hover:border-white/10 hover:bg-white/[0.06] rounded-md flex items-center gap-2 px-2.5 text-xs cursor-grab active:cursor-grabbing transition-colors select-none"
        data-draggable="panel"
        :data-drag-type="item.type"
        @dragstart="(e: DragEvent) => { e.dataTransfer!.effectAllowed = 'copy'; e.dataTransfer!.setData('application/x-mvp-component-type', item.type); e.dataTransfer!.setData('text/plain', item.type); }"
      >
        <span class="text-slate-500 text-xs w-4 text-center">{{ ICONS[item.type] }}</span>
        <span class="text-slate-400">{{ item.label }}</span>
      </div>
    </div>
  </aside>
</template>
