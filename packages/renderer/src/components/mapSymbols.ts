import { MAP_SYMBOL_PRESETS, type MapSymbolPreset } from '@mvp-vue/schema'

/** 五角星 SVG path（ECharts path 坐标系约 0–100） */
const STAR_PATH =
  'path://M50,5 L61,40 L98,40 L68,62 L79,98 L50,75 L21,98 L32,62 L2,40 L39,40 Z'

const ECHARTS_SYMBOL: Record<MapSymbolPreset, string> = {
  pin: 'pin',
  circle: 'circle',
  diamond: 'diamond',
  rect: 'rect',
  roundRect: 'roundRect',
  triangle: 'triangle',
  arrow: 'arrow',
  star: STAR_PATH,
}

/** 将 props 中的 mapSymbol 转为 ECharts series.symbol */
export function resolveEchartsSymbol(props: Record<string, unknown>): string {
  const raw = props.mapSymbol as MapSymbolPreset
  if (raw && MAP_SYMBOL_PRESETS.includes(raw)) {
    return ECHARTS_SYMBOL[raw]
  }
  return 'pin'
}
