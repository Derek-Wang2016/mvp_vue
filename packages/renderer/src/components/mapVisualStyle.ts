import {
  DEFAULT_CHART_TEXT_FONT_SIZE,
  type MapDisplayMode,
  type MapVisualStyle,
} from '@mvp-vue/schema'

/** 与 map defaults 一致，用于判断是否使用用户自定义颜色 */
export const MAP_FACTORY_COLOR_LOW = '#1e293b'
export const MAP_FACTORY_COLOR_HIGH = '#818cf8'
export const MAP_FACTORY_BASE_AREA = '#1e293b'

/** 多彩模式下的 visualMap 色阶（低→高） */
export const MAP_COLORFUL_SCALE = [
  '#1d4ed8',
  '#0891b2',
  '#22c55e',
  '#eab308',
  '#f97316',
  '#ef4444',
]

export interface MapVisualParams {
  colorLow: string
  colorHigh: string
  colorScale?: string[]
  mapBaseAreaColor: string
  fillAreaColor: string
  borderColor: string
  borderWidth: number
  labelFontSize: number
  labelFontWeight: 'normal' | 'bold'
  labelTextBorderColor?: string
  labelTextBorderWidth?: number
  symbolSizeScale: number
  scatterShadowBlur: number
  emphasisAreaColor?: string
}

function resolveVisualStyle(props: Record<string, unknown>): MapVisualStyle {
  const s = props.mapVisualStyle as MapVisualStyle
  if (s === 'vivid' || s === 'dashboard' || s === 'colorful') return s
  return 'default'
}

function isFactoryColor(user: string, factory: string): boolean {
  return user.trim().toLowerCase() === factory.toLowerCase()
}

export function resolveMapVisualParams(
  props: Record<string, unknown>,
  _displayMode: MapDisplayMode,
): MapVisualParams {
  const style = resolveVisualStyle(props)
  const textFontSize = (props.textFontSize as number) ?? DEFAULT_CHART_TEXT_FONT_SIZE

  let colorLow = (props.colorLow as string) ?? MAP_FACTORY_COLOR_LOW
  let colorHigh = (props.colorHigh as string) ?? MAP_FACTORY_COLOR_HIGH
  let mapBaseAreaColor = (props.mapBaseAreaColor as string) ?? MAP_FACTORY_BASE_AREA

  let borderColor = '#475569'
  let borderWidth = 0.5
  let labelFontSize = Math.max(9, textFontSize - 2)
  let labelFontWeight: 'normal' | 'bold' = 'normal'
  let labelTextBorderColor: string | undefined
  let labelTextBorderWidth: number | undefined
  let symbolSizeScale = 1
  let scatterShadowBlur = 0
  let emphasisAreaColor: string | undefined
  let colorScale: string[] | undefined

  if (style === 'colorful') {
    colorScale = [...MAP_COLORFUL_SCALE]
    if (isFactoryColor(mapBaseAreaColor, MAP_FACTORY_BASE_AREA)) mapBaseAreaColor = '#1a2332'
    borderColor = '#94a3b8'
    borderWidth = 1
    labelFontWeight = 'bold'
    labelTextBorderColor = 'rgba(15, 23, 42, 0.85)'
    labelTextBorderWidth = 2
    symbolSizeScale = 1.12
    scatterShadowBlur = 4
    emphasisAreaColor = '#f97316'
  } else if (style === 'vivid') {
    if (isFactoryColor(colorLow, MAP_FACTORY_COLOR_LOW)) colorLow = '#0c4a6e'
    if (isFactoryColor(colorHigh, MAP_FACTORY_COLOR_HIGH)) colorHigh = '#38bdf8'
    if (isFactoryColor(mapBaseAreaColor, MAP_FACTORY_BASE_AREA)) mapBaseAreaColor = '#1e293b'
    borderColor = '#cbd5e1'
    borderWidth = 1.2
    labelFontWeight = 'bold'
    labelTextBorderColor = 'rgba(15, 23, 42, 0.85)'
    labelTextBorderWidth = 2
    symbolSizeScale = 1.15
  } else if (style === 'dashboard') {
    if (isFactoryColor(colorLow, MAP_FACTORY_COLOR_LOW)) colorLow = '#0f172a'
    if (isFactoryColor(colorHigh, MAP_FACTORY_COLOR_HIGH)) colorHigh = '#22d3ee'
    if (isFactoryColor(mapBaseAreaColor, MAP_FACTORY_BASE_AREA)) mapBaseAreaColor = '#0a1018'
    borderColor = '#e2e8f0'
    borderWidth = 2
    labelFontSize = Math.max(11, textFontSize)
    labelFontWeight = 'bold'
    labelTextBorderColor = 'rgba(15, 23, 42, 0.9)'
    labelTextBorderWidth = 2
    symbolSizeScale = 1.25
    scatterShadowBlur = 8
    emphasisAreaColor = colorHigh
  }

  return {
    colorLow,
    colorHigh,
    colorScale,
    mapBaseAreaColor,
    fillAreaColor: style === 'dashboard' ? colorLow : colorLow,
    borderColor,
    borderWidth,
    labelFontSize,
    labelFontWeight,
    labelTextBorderColor,
    labelTextBorderWidth,
    symbolSizeScale,
    scatterShadowBlur,
    emphasisAreaColor,
  }
}
