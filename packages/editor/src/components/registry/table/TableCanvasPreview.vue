<script setup lang="ts">
import MockTable from '../../MockTable.vue'
import type { CanvasPreviewProps } from '../types'

const props = defineProps<CanvasPreviewProps>()

function onCellChange(rowIdx: number, colIdx: number, value: string) {
  const prev = (props.comp.props.cellData as string[][] | undefined) ?? []
  const next = prev.map((row) => [...row])
  while (next.length <= rowIdx) next.push([])
  while ((next[rowIdx]?.length ?? 0) <= colIdx) next[rowIdx]!.push('')
  next[rowIdx]![colIdx] = value
  props.updateProps?.({ cellData: next })
}
</script>

<template>
  <MockTable
    :rows="comp.props.rows as number"
    :cols="comp.props.cols as number"
    :outer-border-width="comp.props.outerBorderWidth as number"
    :inner-border-width="comp.props.innerBorderWidth as number"
    :outer-border-color="comp.props.outerBorderColor as string"
    :inner-border-color="comp.props.innerBorderColor as string"
    :edge-border-color="comp.props.edgeBorderColor as string"
    :header-color="comp.props.headerColor as string"
    :header-height="comp.props.headerHeight as number"
    :row-height="comp.props.rowHeight as number"
    :header-font-size="comp.props.headerFontSize as number"
    :cell-font-size="comp.props.cellFontSize as number"
    :cell-data="comp.props.cellData as string[][] | undefined"
    @cell-change="onCellChange"
  />
</template>
