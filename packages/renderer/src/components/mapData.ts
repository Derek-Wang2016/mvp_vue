import type { MapLevel } from '@mvp-vue/schema'

const NAME_KEYS = ['name', 'province', 'region', 'area', 'label', 'title', 'adname', '省份', '地区']
const VALUE_KEYS = ['value', 'count', 'amount', 'total', 'num', 'y', '数值', '数量']

function pickKey(obj: Record<string, unknown>, preferred: string | undefined, fallbacks: string[]): string | undefined {
  if (preferred && preferred in obj) return preferred
  for (const k of fallbacks) {
    if (k in obj) return k
  }
  return undefined
}

export interface MapSeriesItem {
  name: string
  value: number
}

/** 将数据源数组映射为 ECharts map series data */
export function mapMapData(
  raw: unknown,
  nameField?: string,
  valueField?: string,
): MapSeriesItem[] | null {
  if (!raw) return null
  const arr = raw as unknown[]
  if (!Array.isArray(arr) || arr.length === 0) return null

  const items: MapSeriesItem[] = []
  for (const row of arr) {
    if (typeof row !== 'object' || row === null) continue
    const obj = row as Record<string, unknown>
    const nk = pickKey(obj, nameField, NAME_KEYS)
    const vk = pickKey(obj, valueField, VALUE_KEYS)
    if (!nk) continue
    const name = String(obj[nk]).trim()
    if (!name) continue
    const value = vk ? Number(obj[vk]) : 0
    items.push({ name, value: Number.isFinite(value) ? value : 0 })
  }
  return items.length > 0 ? items : null
}

/** 全国 — 示例省级数据 */
export const FALLBACK_COUNTRY_DATA: MapSeriesItem[] = [
  { name: '北京市', value: 120 },
  { name: '上海市', value: 200 },
  { name: '广东省', value: 380 },
  { name: '浙江省', value: 310 },
  { name: '四川省', value: 260 },
  { name: '湖北省', value: 190 },
  { name: '新疆维吾尔自治区', value: 90 },
  { name: '西藏自治区', value: 60 },
]

/** 省级 — 示例地级市数据（adcode → 数据） */
export const FALLBACK_PROVINCE_DATA: Record<number, MapSeriesItem[]> = {
  610000: [
    { name: '西安市', value: 320 },
    { name: '宝鸡市', value: 128 },
    { name: '咸阳市', value: 210 },
    { name: '渭南市', value: 165 },
  ],
  440000: [
    { name: '广州市', value: 330 },
    { name: '深圳市', value: 229 },
    { name: '佛山市', value: 180 },
  ],
}

/** @deprecated 使用 getFallbackMapData */
export const FALLBACK_MAP_DATA = FALLBACK_COUNTRY_DATA

export function getFallbackMapData(level: MapLevel, adcode: number): MapSeriesItem[] {
  if (level === 'country') return FALLBACK_COUNTRY_DATA
  return FALLBACK_PROVINCE_DATA[adcode] ?? []
}
