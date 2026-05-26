<script setup lang="ts">
import { ref } from 'vue'
import type { PageComponent } from '@mvp-vue/schema'

const props = defineProps<{
  rows?: number
  cols?: number
  outerBorderWidth?: number
  innerBorderWidth?: number
  outerBorderColor?: string
  innerBorderColor?: string
  edgeBorderColor?: string
  headerColor?: string
  headerHeight?: number
  rowHeight?: number
  headerFontSize?: number
  cellFontSize?: number
  cellData?: string[][]
}>()

const emit = defineEmits<{
  cellChange: [rowIdx: number, colIdx: number, value: string]
}>()

const r = () => props.rows ?? 5
const c = () => props.cols ?? 5
const obw = () => props.outerBorderWidth ?? 2
const ibw = () => props.innerBorderWidth ?? 1
const obc = () => props.outerBorderColor ?? 'transparent'
const ibc = () => props.innerBorderColor ?? '#1e293b'
const ebc = () => props.edgeBorderColor ?? '#334155'
const hc = () => props.headerColor ?? 'rgba(30,41,59,0.6)'
const hh = () => props.headerHeight ?? 32
const rh = () => props.rowHeight ?? 28
const hfs = () => props.headerFontSize ?? 14
const cfs = () => props.cellFontSize ?? 13

function cellBorderStyle(rowIdx: number, colIdx: number, totalRows: number, totalCols: number) {
  const top = rowIdx === 0 ? ebc() : ibc()
  const bottom = rowIdx === totalRows - 1 ? ebc() : ibc()
  const left = colIdx === 0 ? ebc() : ibc()
  const right = colIdx === totalCols - 1 ? ebc() : ibc()
  return {
    borderTop: `${ibw()}px solid ${top}`,
    borderBottom: `${ibw()}px solid ${bottom}`,
    borderLeft: `${ibw()}px solid ${left}`,
    borderRight: `${ibw()}px solid ${right}`,
  }
}

function getCell(rowIdx: number, colIdx: number): string {
  return props.cellData?.[rowIdx]?.[colIdx] ?? ''
}

const dialog = ref<{ row: number; col: number } | null>(null)
const draft = ref('')

function openDialog(rowIdx: number, colIdx: number) {
  draft.value = getCell(rowIdx, colIdx)
  dialog.value = { row: rowIdx, col: colIdx }
}

function confirm() {
  if (dialog.value && getCell(dialog.value.row, dialog.value.col) !== draft.value) {
    emit('cellChange', dialog.value.row, dialog.value.col, draft.value)
  }
  dialog.value = null
}
</script>

<template>
  <div class="w-full h-full overflow-hidden" :style="{ border: `${obw()}px solid ${obc()}` }">
    <table class="w-full border-collapse" style="table-layout: fixed">
      <thead>
        <tr :style="{ background: hc(), height: hh() + 'px' }">
          <th
            v-for="j in c()" :key="j"
            :style="{
              ...cellBorderStyle(0, j - 1, r(), c()),
              cursor: 'pointer',
              fontSize: hfs() + 'px',
              fontWeight: 500,
              color: '#e2e8f0',
              padding: '0 4px',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }"
            @dblclick.stop="openDialog(0, j - 1)"
          >{{ getCell(0, j - 1) || ' ' }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="i in Math.max(0, r() - 1)" :key="i" :style="{ height: rh() + 'px' }">
          <td
            v-for="j in c()" :key="j"
            :style="{
              ...cellBorderStyle(i, j - 1, r(), c()),
              cursor: 'pointer',
              fontSize: cfs() + 'px',
              color: '#cbd5e1',
              padding: '0 4px',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }"
            @dblclick.stop="openDialog(i, j - 1)"
          >{{ getCell(i, j - 1) || ' ' }}</td>
        </tr>
      </tbody>
    </table>

    <!-- Edit dialog -->
    <div v-if="dialog" class="absolute inset-0 z-50 flex items-center justify-center bg-black/60" @click="dialog = null">
      <div class="bg-[#1a2332] border border-white/20 rounded-lg shadow-2xl p-4 w-80" @click.stop>
        <div class="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
          编辑 ({{ dialog.row === 0 ? '表头' : `行${dialog.row}` }}, 列{{ dialog.col + 1 }})
        </div>
        <textarea
          v-model="draft"
          class="w-full h-24 bg-white/5 border border-white/10 rounded-md px-2.5 py-1.5 text-slate-200 resize-none outline-none focus:border-indigo-400/50 transition-colors"
          :style="{ fontSize: cfs() + 'px' }"
          @keydown="(e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); confirm() }
            if (e.key === 'Escape') dialog = null
          }"
        />
        <div class="flex justify-end gap-2 mt-3">
          <button class="px-3 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors" @click="dialog = null">取消</button>
          <button class="px-3 py-1 text-xs bg-indigo-500 hover:bg-indigo-400 text-white rounded transition-colors" @click="confirm">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>
