export function keyValueTagDefaultProps() {
  return {
    keyField: 'name',
    valueField: 'value',
    /** 非空时仅显示列表中的 KEY（精确匹配），并按列表顺序排列 */
    visibleKeys: [] as string[],
    /** 非空时隐藏列表中的 KEY；与 visibleKeys 冲突时以本列表为准 */
    hiddenKeys: [] as string[],
    direction: 'horizontal' as 'horizontal' | 'vertical',
    gap: 8,
    maxPerRow: 0,
    maxPerCol: 0,
    /** 固定每项高度（配合滚动可避免数据量变化导致视觉跳动） */
    itemEqualHeight: false,
    itemHeight: 40,
    /** 开启后在每项内部自动纵向滚动（无滚动条） */
    overflowScrollY: false,
    /** 等宽外框 + KEY/VALUE 两列对齐（KEY 右对齐，VALUE 左对齐） */
    itemEqualWidth: false,
    keyValueColumnGap: 8,
    /** 等宽模式下全局 KEY 列宽（px）；0 = 未设置时与 VALUE 等分 */
    keyColumnWidth: 0,
    /** 等宽模式下按 KEY 名覆盖列宽（px） */
    keyWidths: {} as Record<string, number>,
    itemBoxEnabled: true,
    itemBoxBgColor: 'rgba(255,255,255,0.06)',
    itemBoxBorderColor: 'rgba(148,163,184,0.4)',
    itemBoxBorderWidth: 1,
    itemBoxBorderStyle: 'solid' as 'solid' | 'dashed' | 'dotted' | 'none',
    itemBoxBorderRadius: 6,
    itemBoxPadding: 8,
    labelFontSize: '14px',
    labelFontWeight: 'bold' as 'normal' | 'bold',
    labelColor: '#94a3b8',
    labelBgColor: 'transparent',
    labelFontFamily: 'sans-serif',
    valueFontSize: '14px',
    valueFontWeight: 'normal' as 'normal' | 'bold',
    valueColor: '#e2e8f0',
    valueBgColor: 'rgba(255,255,255,0.08)',
    valueFontFamily: 'sans-serif',
    valueBorderRadius: 4,
    tagSplitEnabled: false,
    tagSeparator: ',',
    tagGap: 4,
    /** TAG 切分时每个 TAG 的等宽（px）；文字在 TAG 内居中 */
    tagWidth: 48,
    showValueCount: false,
    labelAbbrevEnabled: false,
    labelColorDictEnabled: false,
    labelIconDictEnabled: false,
  }
}

export function keyValueTagDefaultSize() {
  return { w: 400, h: 200 }
}
