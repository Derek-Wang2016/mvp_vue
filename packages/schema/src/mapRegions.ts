/** 地图层级：全国（省级边界） / 省级（地级市边界） */
export type MapLevel = 'country' | 'province'

/** 地图展示：区域填色 / 图标散点（颜色表示数值） */
export type MapDisplayMode = 'fill' | 'symbol'

/** 视觉效果预设：默认 / 高对比 / 大屏强调 / 多彩渐变 */
export type MapVisualStyle = 'default' | 'vivid' | 'dashboard' | 'colorful'

export const MAP_VISUAL_STYLE_OPTIONS: { id: MapVisualStyle; label: string }[] = [
  { id: 'default', label: '默认' },
  { id: 'vivid', label: '高对比' },
  { id: 'dashboard', label: '大屏强调' },
  { id: 'colorful', label: '多彩渐变' },
]

export function getMapVisualStyleLabel(style: MapVisualStyle | undefined): string {
  return MAP_VISUAL_STYLE_OPTIONS.find((o) => o.id === style)?.label ?? '默认'
}

/** 地图散点图标预设（部分为 ECharts 内置，star 等为 path） */
export type MapSymbolPreset =
  | 'pin'
  | 'circle'
  | 'diamond'
  | 'rect'
  | 'roundRect'
  | 'triangle'
  | 'arrow'
  | 'star'

export const MAP_SYMBOL_PRESETS: MapSymbolPreset[] = [
  'pin',
  'circle',
  'star',
  'diamond',
  'triangle',
  'arrow',
  'rect',
  'roundRect',
]

export interface MapProvinceOption {
  adcode: number
  name: string
}

/** 全国省级行政区（用于「省级」地图下钻） */
export const MAP_PROVINCE_OPTIONS: MapProvinceOption[] = [
  { adcode: 110000, name: '北京市' },
  { adcode: 120000, name: '天津市' },
  { adcode: 130000, name: '河北省' },
  { adcode: 140000, name: '山西省' },
  { adcode: 150000, name: '内蒙古自治区' },
  { adcode: 210000, name: '辽宁省' },
  { adcode: 220000, name: '吉林省' },
  { adcode: 230000, name: '黑龙江省' },
  { adcode: 310000, name: '上海市' },
  { adcode: 320000, name: '江苏省' },
  { adcode: 330000, name: '浙江省' },
  { adcode: 340000, name: '安徽省' },
  { adcode: 350000, name: '福建省' },
  { adcode: 360000, name: '江西省' },
  { adcode: 370000, name: '山东省' },
  { adcode: 410000, name: '河南省' },
  { adcode: 420000, name: '湖北省' },
  { adcode: 430000, name: '湖南省' },
  { adcode: 440000, name: '广东省' },
  { adcode: 450000, name: '广西壮族自治区' },
  { adcode: 460000, name: '海南省' },
  { adcode: 500000, name: '重庆市' },
  { adcode: 510000, name: '四川省' },
  { adcode: 520000, name: '贵州省' },
  { adcode: 530000, name: '云南省' },
  { adcode: 540000, name: '西藏自治区' },
  { adcode: 610000, name: '陕西省' },
  { adcode: 620000, name: '甘肃省' },
  { adcode: 630000, name: '青海省' },
  { adcode: 640000, name: '宁夏回族自治区' },
  { adcode: 650000, name: '新疆维吾尔自治区' },
  { adcode: 710000, name: '台湾省' },
  { adcode: 810000, name: '香港特别行政区' },
  { adcode: 820000, name: '澳门特别行政区' },
]

export const CHINA_COUNTRY_ADCODE = 100000
export const DEFAULT_MAP_PROVINCE_ADCODE = 610000

export function getMapEchartsKey(level: MapLevel, adcode: number): string {
  return level === 'country' ? 'china' : `province-${adcode}`
}

/** 从组件 props 解析地图层级（兼容旧版 mapRegion: 'china'） */
export function resolveMapConfig(props: Record<string, unknown>): { level: MapLevel; adcode: number } {
  const level: MapLevel = props.mapLevel === 'province' ? 'province' : 'country'
  if (level === 'province') {
    const raw = props.mapProvinceAdcode
    const adcode = typeof raw === 'number' ? raw : Number(raw)
    const valid = MAP_PROVINCE_OPTIONS.some((p) => p.adcode === adcode)
    return {
      level: 'province',
      adcode: valid ? adcode : DEFAULT_MAP_PROVINCE_ADCODE,
    }
  }
  return { level: 'country', adcode: CHINA_COUNTRY_ADCODE }
}

export function getMapProvinceName(adcode: number): string | undefined {
  return MAP_PROVINCE_OPTIONS.find((p) => p.adcode === adcode)?.name
}
