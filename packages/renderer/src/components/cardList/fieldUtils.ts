import type { CSSProperties } from 'vue'
import {
  getCardFieldLayout,
  type CardFieldConfig,
  type CardFieldLayoutId,
  type ColorDictEntry,
  type IconDictEntry,
} from '@mvp-vue/schema'

export const FIELD_TEXT_PAD_X = 4
export const FIELD_TEXT_PAD_Y = 2

export type CardFieldGridEdge = {
  bleedLeft: boolean
  bleedRight: boolean
  bleedTop: boolean
  bleedBottom: boolean
}

export function resolveColor(
  colorDict: ColorDictEntry[] | undefined,
  item: Record<string, unknown>,
  colorValue: string | undefined,
  currentFieldValue: unknown,
): string | undefined {
  if (!colorValue || !colorValue.startsWith('DICT')) return colorValue
  if (!colorDict || colorDict.length === 0) return undefined
  const dictSpec = colorValue.startsWith('DICT:') ? colorValue.slice(5).trim() : ''
  const useFieldValue =
    dictSpec === '' || dictSpec === '$VALUE' || dictSpec.toUpperCase() === '$VALUE'
  const matchValue = useFieldValue
    ? String(currentFieldValue ?? '')
    : String(item[dictSpec] ?? '')
  return colorDict.find((e) => e.key === matchValue)?.matchColor
}

export function buildCardFieldGridEdges(
  entries: { f: CardFieldConfig; j: number }[],
  cardGridCols: number,
): Map<number, CardFieldGridEdge> {
  const edges = new Map<number, CardFieldGridEdge>()
  let row = 0
  let col = 0
  let maxRow = 0
  const placements: { j: number; row: number; colStart: number; colSpan: number }[] = []

  for (const { f, j } of entries) {
    const layout = getCardFieldLayout(f.layoutId)
    if (layout.id === 'divider') {
      if (col > 0) {
        row += 1
        col = 0
      }
      placements.push({ j, row, colStart: 0, colSpan: cardGridCols })
      maxRow = Math.max(maxRow, row)
      row += 1
      col = 0
      continue
    }
    let colSpan = Math.min(Math.max(1, f.gridColSpan ?? 1), cardGridCols)
    if (col > 0 && col + colSpan > cardGridCols) {
      row += 1
      col = 0
    }
    placements.push({ j, row, colStart: col, colSpan })
    maxRow = Math.max(maxRow, row)
    col += colSpan
    if (col >= cardGridCols) {
      row += 1
      col = 0
    }
  }

  for (const p of placements) {
    edges.set(p.j, {
      bleedLeft: p.colStart === 0,
      bleedRight: p.colStart + p.colSpan >= cardGridCols,
      bleedTop: p.row === 0,
      bleedBottom: p.row >= maxRow,
    })
  }
  return edges
}

export function cardFieldFlowWidth(cols: number, colSpan: number, gapX: number): string {
  const c = Math.max(1, cols)
  const span = Math.min(Math.max(1, colSpan), c)
  const unit = `(100% - ${(c - 1) * gapX}px) / ${c}`
  if (span <= 1) return `calc(${unit})`
  return `calc((${unit}) * ${span} + ${(span - 1) * gapX}px)`
}

export function widenCalcCssSize(base: string, extraPx: number): string {
  if (extraPx <= 0) return base
  const trimmed = base.trim()
  if (trimmed.startsWith('calc(') && trimmed.endsWith(')')) {
    return `calc(${trimmed.slice(5, -1)} + ${extraPx}px)`
  }
  return `calc(${trimmed} + ${extraPx}px)`
}

function fieldWillBgBleed(
  itemInset: number,
  inCardGrid: boolean,
  colSpan: number,
  cardGridCols: number,
  gridEdge: CardFieldGridEdge | undefined,
): boolean {
  if (itemInset <= 0 || !gridEdge) return false
  if (!inCardGrid || colSpan >= cardGridCols) return true
  return gridEdge.bleedLeft || gridEdge.bleedRight || gridEdge.bleedTop || gridEdge.bleedBottom
}

export function resolveFieldGridEdge(
  fieldGridEdges: Map<number, CardFieldGridEdge> | null,
  fieldIndex: number,
  cardGridCols: number,
  isFirstVisible: boolean,
  isLastVisible: boolean,
): CardFieldGridEdge | undefined {
  const hit = fieldGridEdges?.get(fieldIndex)
  if (hit) return hit
  if (cardGridCols <= 1) {
    return {
      bleedLeft: true,
      bleedRight: true,
      bleedTop: isFirstVisible,
      bleedBottom: isLastVisible,
    }
  }
  return undefined
}

export function applyFieldContentPadding(
  style: CSSProperties,
  itemInset: number,
  edge: CardFieldGridEdge,
  hasBgEdgeBleed: boolean,
): void {
  style.boxSizing = 'border-box'
  const extraL = hasBgEdgeBleed && edge.bleedLeft ? itemInset : 0
  const extraR = hasBgEdgeBleed && edge.bleedRight ? itemInset : 0
  const extraT = hasBgEdgeBleed && edge.bleedTop ? itemInset : 0
  const extraB = hasBgEdgeBleed && edge.bleedBottom ? itemInset : 0
  style.paddingTop = `${FIELD_TEXT_PAD_Y + extraT}px`
  style.paddingRight = `${FIELD_TEXT_PAD_X + extraR}px`
  style.paddingBottom = `${FIELD_TEXT_PAD_Y + extraB}px`
  style.paddingLeft = `${FIELD_TEXT_PAD_X + extraL}px`
}

export function applyFieldBgToContainer(
  style: CSSProperties,
  opts: {
    itemInset: number
    bgPaint: string
    inCardGrid: boolean
    colSpan: number
    cardGridCols: number
    isFirstVisible: boolean
    isLastVisible: boolean
    gridEdge?: CardFieldGridEdge
    flowWidth?: string
  },
): void {
  const {
    itemInset,
    bgPaint,
    inCardGrid,
    colSpan,
    cardGridCols,
    isFirstVisible,
    isLastVisible,
    gridEdge,
    flowWidth,
  } = opts
  style.backgroundColor = bgPaint
  style.boxSizing = 'border-box'

  const fullRowBleed = itemInset > 0 && (!inCardGrid || colSpan >= cardGridCols)
  const partialBleed = itemInset > 0 && inCardGrid && gridEdge && colSpan < cardGridCols

  if (!fullRowBleed && !partialBleed) return

  let bleedLeft: boolean
  let bleedRight: boolean
  let bleedTop: boolean
  let bleedBottom: boolean

  if (fullRowBleed) {
    bleedLeft = true
    bleedRight = true
    bleedTop = isFirstVisible
    bleedBottom = isLastVisible
  } else {
    bleedLeft = gridEdge!.bleedLeft
    bleedRight = gridEdge!.bleedRight
    bleedTop = gridEdge!.bleedTop
    bleedBottom = gridEdge!.bleedBottom
  }

  if (bleedLeft) style.marginLeft = `-${itemInset}px`
  if (bleedRight) style.marginRight = `-${itemInset}px`
  if (bleedTop) style.marginTop = `-${itemInset}px`
  if (bleedBottom) style.marginBottom = `-${itemInset}px`

  const extraW = (bleedLeft ? itemInset : 0) + (bleedRight ? itemInset : 0)
  if (!inCardGrid) {
    const fullW = `calc(100% + ${extraW}px)`
    style.width = fullW
    style.maxWidth = fullW
  } else if (colSpan >= cardGridCols) {
    const fullW = `calc(100% + ${extraW}px)`
    style.flex = `0 0 ${fullW}`
    style.width = fullW
    style.maxWidth = fullW
  } else if (flowWidth && extraW > 0) {
    const widened = widenCalcCssSize(flowWidth, extraW)
    style.flex = `0 0 ${widened}`
    style.width = widened
    style.maxWidth = widened
  }
}

export interface FieldPresentation {
  fieldKey: string
  layoutId: CardFieldLayoutId
  containerClass: string
  labelClass: string
  valueClass: string
  isDivider: boolean
  dividerStyle?: CSSProperties
  containerStyle: CSSProperties
  labelStyle: CSSProperties
  valueStyle: CSSProperties
  hiddenForCardEmpty: boolean
  showLabel: boolean
  labelIconEntry?: IconDictEntry
  textColor?: string
  tagItems?: { matchKey: string; display: string }[]
  valueIconEntry?: IconDictEntry
  displayValue: string
  valueText: string
  valueFillsCell: boolean
  wantsBgSlot: boolean
}

export function buildFieldPresentation(opts: {
  item: Record<string, unknown>
  f: CardFieldConfig
  j: number
  hiddenForCardEmpty: boolean
  colorDict?: ColorDictEntry[]
  iconMap: Map<string, IconDictEntry>
  defaultLabelWidthCh: number
  itemInset: number
  cardGridCols: number
  cardGridColumnGap: number
  fieldGridEdges: Map<number, CardFieldGridEdge> | null
  isFirstVisibleField: boolean
  isLastVisibleField: boolean
}): FieldPresentation {
  const {
    item,
    f,
    j,
    hiddenForCardEmpty,
    colorDict,
    iconMap,
    defaultLabelWidthCh,
    itemInset,
    cardGridCols,
    cardGridColumnGap,
    fieldGridEdges,
    isFirstVisibleField,
    isLastVisibleField,
  } = opts

  const fieldKey = f.field ? `${f.field}-${j}` : `field-${j}`
  const inCardGrid = cardGridCols > 1
  const layout = getCardFieldLayout(f.layoutId)
  const fieldValue = item[f.field]
  const resolvedTextColor = resolveColor(colorDict, item, f.textColor, fieldValue)
  const textColor = f.textColor?.startsWith('DICT') ? resolvedTextColor : f.textColor
  const bgColorRaw = f.bgColor?.trim()
  const wantsBgSlot = Boolean(bgColorRaw)
  const resolvedBg = resolveColor(colorDict, item, f.bgColor, fieldValue)
  const bgPaint = bgColorRaw?.startsWith('DICT') ? resolvedBg : bgColorRaw
  const hasBgPaint = Boolean(bgPaint)
  const isDefaultLayout = layout.id === 'default'
  const colSpan = f.gridColSpan ?? 1
  const valueFillsCell = inCardGrid && colSpan > 1

  const valueStyle: Record<string, string> = {}
  const labelStyle: Record<string, string> = {}

  if (f.fontSize) {
    valueStyle.fontSize = f.fontSize
    labelStyle.fontSize = f.fontSize
  }
  if (f.fontWeight) {
    valueStyle.fontWeight = f.fontWeight
    labelStyle.fontWeight = f.fontWeight
  }
  if (textColor) {
    valueStyle.color = textColor
    labelStyle.color = textColor
  }

  const labelIsIcon = Boolean(f.label && iconMap.has(f.label))
  if (isDefaultLayout && defaultLabelWidthCh > 0 && f.label && !labelIsIcon) {
    const labelCol = `${defaultLabelWidthCh}ch`
    labelStyle.flex = `0 0 ${labelCol}`
    labelStyle.width = labelCol
    labelStyle.minWidth = labelCol
    labelStyle.maxWidth = labelCol
  }

  if (f.textAlign) {
    valueStyle.textAlign = f.textAlign
    if (layout.id === 'value-only' || layout.id === 'label-above') {
      valueStyle.width = '100%'
      valueStyle.display = 'block'
    }
  }

  if (valueFillsCell) {
    valueStyle.width = '100%'
    valueStyle.maxWidth = '100%'
    valueStyle.alignSelf = 'stretch'
    valueStyle.boxSizing = 'border-box'
    if (layout.id === 'value-only' || layout.id === 'label-above') {
      valueStyle.display = valueStyle.display || 'flex'
      valueStyle.alignItems = 'center'
      valueStyle.flex = '1 1 auto'
      valueStyle.minWidth = '0'
    }
  }

  if (wantsBgSlot) {
    valueStyle.boxSizing = 'border-box'
    valueStyle.display = valueFillsCell ? 'flex' : 'inline-flex'
    valueStyle.alignItems = 'center'
    valueStyle.maxWidth = '100%'
    if (f.textAlign) {
      valueStyle.justifyContent =
        f.textAlign === 'center' ? 'center' : f.textAlign === 'right' ? 'flex-end' : 'flex-start'
    }
    if (isDefaultLayout) {
      valueStyle.flex = '1 1 0%'
      valueStyle.minWidth = '0'
    } else if (f.textAlign || valueFillsCell) {
      valueStyle.width = '100%'
    } else {
      valueStyle.maxWidth = '100%'
    }
  }

  if (!valueStyle.maxWidth) valueStyle.maxWidth = '100%'

  if (layout.id === 'divider') {
    return {
      fieldKey,
      layoutId: layout.id,
      containerClass: layout.containerClass,
      labelClass: layout.labelClass,
      valueClass: layout.valueClass,
      isDivider: true,
      dividerStyle: {
        flex: inCardGrid ? '1 1 100%' : undefined,
        width: inCardGrid ? '100%' : undefined,
        margin: '0',
      },
      containerStyle: {},
      labelStyle: {},
      valueStyle: {},
      hiddenForCardEmpty,
      showLabel: false,
      displayValue: '',
      valueText: '',
      valueFillsCell,
      wantsBgSlot,
    }
  }

  const flowWidth = inCardGrid ? cardFieldFlowWidth(cardGridCols, colSpan, cardGridColumnGap) : undefined
  const fieldContainerStyle: CSSProperties = {
    minWidth: 0,
    minHeight: 0,
    width: inCardGrid ? flowWidth : '100%',
    maxWidth: inCardGrid ? flowWidth : '100%',
    flex: inCardGrid ? `0 0 ${flowWidth}` : undefined,
    height: inCardGrid ? undefined : '100%',
    boxSizing: 'border-box',
    display: 'flex',
    alignSelf: 'stretch',
    ...(hiddenForCardEmpty ? { visibility: 'hidden', pointerEvents: 'none' as const } : {}),
  }

  const gridEdge = resolveFieldGridEdge(
    fieldGridEdges,
    j,
    cardGridCols,
    isFirstVisibleField,
    isLastVisibleField,
  )
  const bgEdgeBleed =
    hasBgPaint && fieldWillBgBleed(itemInset, inCardGrid, colSpan, cardGridCols, gridEdge)

  if (gridEdge) {
    applyFieldContentPadding(fieldContainerStyle, itemInset, gridEdge, bgEdgeBleed)
  } else {
    fieldContainerStyle.padding = `${FIELD_TEXT_PAD_Y}px ${FIELD_TEXT_PAD_X}px`
  }

  if (hasBgPaint && bgPaint) {
    applyFieldBgToContainer(fieldContainerStyle, {
      itemInset,
      bgPaint,
      inCardGrid,
      colSpan,
      cardGridCols,
      isFirstVisible: isFirstVisibleField,
      isLastVisible: isLastVisibleField,
      gridEdge,
      flowWidth,
    })
  }

  if (layout.id === 'default') {
    fieldContainerStyle.flexDirection = 'row'
    fieldContainerStyle.alignItems = 'stretch'
    fieldContainerStyle.gap = '6px'
    labelStyle.display = 'flex'
    labelStyle.alignItems = 'center'
    labelStyle.justifyContent = 'flex-end'
    labelStyle.alignSelf = 'stretch'
    labelStyle.boxSizing = 'border-box'
    if (!labelStyle.flex && f.label) labelStyle.flex = '0 0 auto'
    if (!wantsBgSlot) {
      valueStyle.display = valueStyle.display || 'flex'
      valueStyle.alignItems = 'center'
      valueStyle.alignSelf = 'stretch'
      valueStyle.flex = valueStyle.flex || '1 1 0%'
      valueStyle.minWidth = valueStyle.minWidth || '0'
    }
  } else if (layout.id === 'label-above') {
    fieldContainerStyle.flexDirection = 'column'
    fieldContainerStyle.justifyContent = 'center'
    fieldContainerStyle.alignItems =
      f.textAlign === 'center' ? 'center' : f.textAlign === 'right' ? 'flex-end' : 'stretch'
    labelStyle.width = '100%'
    labelStyle.display = 'flex'
    labelStyle.alignItems = 'center'
    labelStyle.boxSizing = 'border-box'
    labelStyle.justifyContent =
      f.textAlign === 'center' ? 'center' : f.textAlign === 'right' ? 'flex-end' : 'flex-start'
  } else if (layout.id === 'value-only') {
    fieldContainerStyle.alignItems = valueFillsCell || wantsBgSlot ? 'stretch' : 'center'
    fieldContainerStyle.justifyContent =
      f.textAlign === 'center' ? 'center' : f.textAlign === 'right' ? 'flex-end' : 'flex-start'
    if ((inCardGrid && wantsBgSlot) || valueFillsCell) {
      valueStyle.alignSelf = 'stretch'
      if (wantsBgSlot) valueStyle.minHeight = '100%'
    }
  }

  if (valueFillsCell && isDefaultLayout) {
    valueStyle.flex = '1 1 0%'
    valueStyle.minWidth = '0'
    valueStyle.width = '100%'
    valueStyle.display = valueStyle.display || 'flex'
    valueStyle.alignItems = 'center'
    valueStyle.alignSelf = 'stretch'
  }
  if (inCardGrid && wantsBgSlot && isDefaultLayout) {
    valueStyle.display = 'flex'
    valueStyle.alignSelf = 'stretch'
    valueStyle.alignItems = 'center'
    valueStyle.minHeight = '100%'
    valueStyle.flex = '1 1 0%'
    valueStyle.minWidth = '0'
  }
  if (inCardGrid && wantsBgSlot && layout.id === 'value-only') {
    valueStyle.display = 'flex'
  }

  const labelIconEntry = f.label ? iconMap.get(f.label) : undefined
  const showLabel = layout.id !== 'value-only' && Boolean(f.label)

  return {
    fieldKey,
    layoutId: layout.id,
    containerClass: layout.containerClass,
    labelClass: layout.labelClass,
    valueClass: layout.valueClass,
    isDivider: false,
    containerStyle: fieldContainerStyle,
    labelStyle,
    valueStyle,
    hiddenForCardEmpty,
    showLabel,
    labelIconEntry,
    textColor,
    valueFillsCell,
    wantsBgSlot,
    displayValue: '',
    valueText: '',
  }
}
