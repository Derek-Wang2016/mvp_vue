import {
  DEFAULT_CHART_TEXT_FONT_SIZE,
  DEFAULT_CHART_TEXT_COLOR,
  DEFAULT_MAP_PROVINCE_ADCODE,
} from '@mvp-vue/schema'

export function mapDefaultProps() {
  return {
    title: '地图',
    mapLevel: 'country' as const,
    mapProvinceAdcode: DEFAULT_MAP_PROVINCE_ADCODE,
    mapDisplayMode: 'fill' as const,
    mapVisualStyle: 'default' as const,
    mapSymbol: 'pin' as const,
    mapSymbolSize: 14,
    symbolSizeByValue: false,
    symbolSizeMin: 10,
    symbolSizeMax: 28,
    mapBaseAreaColor: '#1e293b',
    textFontSize: DEFAULT_CHART_TEXT_FONT_SIZE,
    textColor: DEFAULT_CHART_TEXT_COLOR,
    colorLow: '#1e293b',
    colorHigh: '#818cf8',
    showValueLabel: true,
    showVisualMap: false,
  }
}

export function mapDefaultSize() {
  return { w: 640, h: 480 }
}
