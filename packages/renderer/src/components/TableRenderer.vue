<script setup lang="ts">
import { computed } from 'vue'
import type { PageComponent } from '@mvp-vue/schema'
import { useData } from '../composables/useData'

const props = defineProps<{ comp: PageComponent }>()
const { data, loading } = useData(props.comp.dataSourceId)

function cellBorderStyle(
  ibw: number, ibc: string, ebc: string,
  rowIdx: number, colIdx: number, totalRows: number, totalCols: number
): Record<string, string> {
  const top = rowIdx === 0 ? ebc : ibc
  const bottom = rowIdx === totalRows - 1 ? ebc : ibc
  const left = colIdx === 0 ? ebc : ibc
  const right = colIdx === totalCols - 1 ? ebc : ibc
  return {
    borderTop: `${ibw}px solid ${top}`,
    borderBottom: `${ibw}px solid ${bottom}`,
    borderLeft: `${ibw}px solid ${left}`,
    borderRight: `${ibw}px solid ${right}`,
  }
}

function mapTableData(raw: unknown): { columns: string[]; rows: Record<string, unknown>[] } | null {
  if (!raw) return null
  const arr = raw as Record<string, unknown>[]
  if (!Array.isArray(arr) || arr.length === 0 || !arr[0]) return null
  const columns = Object.keys(arr[0])
  return { columns, rows: arr }
}

const mapped = computed(() => mapTableData(data.value))

const outerBorderWidth = computed(() => (props.comp.props.outerBorderWidth as number) ?? 2)
const outerBorderColor = computed(() => (props.comp.props.outerBorderColor as string) ?? 'transparent')
const innerBorderWidth = computed(() => (props.comp.props.innerBorderWidth as number) ?? 1)
const innerBorderColor = computed(() => (props.comp.props.innerBorderColor as string) ?? '#1e293b')
const edgeBorderColor = computed(() => (props.comp.props.edgeBorderColor as string) ?? '#334155')
const headerColor = computed(() => (props.comp.props.headerColor as string) ?? 'rgba(30,41,59,0.6)')
const headerHeight = computed(() => (props.comp.props.headerHeight as number) ?? 32)
const rowHeight = computed(() => (props.comp.props.rowHeight as number) ?? 28)
const headerFontSize = computed(() => (props.comp.props.headerFontSize as number) ?? 32)
const cellFontSize = computed(() => (props.comp.props.cellFontSize as number) ?? 32)
</script>

<template>
  <!-- Loading -->
  <div v-if="loading" class="w-full h-full flex items-center justify-center text-gray-500 text-sm">
    加载中...
  </div>

  <!-- Data-driven mode -->
  <div
    v-else-if="mapped"
    class="w-full h-full overflow-auto"
    :style="{ border: `${outerBorderWidth}px solid ${outerBorderColor}` }"
  >
    <table class="w-full border-collapse" style="table-layout: auto">
      <thead>
        <tr :style="{ background: headerColor, height: headerHeight + 'px' }">
          <th
            v-for="(col, j) in mapped.columns" :key="j"
            :style="{
              ...cellBorderStyle(innerBorderWidth, innerBorderColor, edgeBorderColor, 0, j, mapped.rows.length + 1, mapped.columns.length),
              fontSize: headerFontSize + 'px',
              fontWeight: '500',
              color: '#e2e8f0',
              padding: '0 8px',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }"
          >{{ col }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in mapped.rows" :key="i" :style="{ height: rowHeight + 'px' }">
          <td
            v-for="(col, j) in mapped.columns" :key="j"
            :style="{
              ...cellBorderStyle(innerBorderWidth, innerBorderColor, edgeBorderColor, i + 1, j, mapped.rows.length + 1, mapped.columns.length),
              fontSize: cellFontSize + 'px',
              color: '#cbd5e1',
              padding: '0 8px',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }"
          >{{ String(row[col] ?? '') }}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Fallback: static table -->
  <div
    v-else
    class="w-full h-full overflow-hidden"
    :style="{ border: `${outerBorderWidth}px solid ${outerBorderColor}` }"
  >
    <table class="w-full border-collapse" style="table-layout: fixed">
      <thead>
        <tr :style="{ background: headerColor, height: headerHeight + 'px' }">
          <th
            v-for="j in ((comp.props.cols as number) ?? 5)" :key="j"
            :style="{
              ...cellBorderStyle(innerBorderWidth, innerBorderColor, edgeBorderColor, 0, j - 1, (comp.props.rows as number) ?? 5, (comp.props.cols as number) ?? 5),
              fontSize: headerFontSize + 'px',
              fontWeight: '500',
              color: '#e2e8f0',
              padding: '0 4px',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }"
          >{{ (((comp.props.cellData as string[][] | undefined)?.[0]?.[j - 1]) || ' ') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="i in Math.max(0, ((comp.props.rows as number) ?? 5) - 1)" :key="i" :style="{ height: rowHeight + 'px' }">
          <td
            v-for="j in ((comp.props.cols as number) ?? 5)" :key="j"
            :style="{
              ...cellBorderStyle(innerBorderWidth, innerBorderColor, edgeBorderColor, i, j - 1, (comp.props.rows as number) ?? 5, (comp.props.cols as number) ?? 5),
              fontSize: cellFontSize + 'px',
              color: '#cbd5e1',
              padding: '0 4px',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }"
          >{{ (((comp.props.cellData as string[][] | undefined)?.[i]?.[j - 1]) || ' ') }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
