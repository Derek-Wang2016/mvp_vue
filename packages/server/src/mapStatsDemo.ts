import { MAP_PROVINCE_OPTIONS, type MapProvinceOption } from '@mvp-vue/schema/mapRegions'

const MAP_GEO_UPSTREAM = 'https://geo.datav.aliyun.com/areas_v3/bound'

export interface MapStatsRow {
  name: string
  value: number
}

export interface MapStatsResponse {
  level: 'country' | 'province'
  province: string | null
  adcode: number
  data: MapStatsRow[]
  generatedAt: string
}

const geoJsonCache = new Map<string, unknown>()
const regionNamesCache = new Map<string, string[]>()

/** 默认随机区间；可通过 query min/max 覆盖 */
export function randomMapValue(min = 50, max = 500): number {
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  return Math.floor(lo + Math.random() * (hi - lo + 1))
}

function rowsWithRandomValues(names: string[], min: number, max: number): MapStatsRow[] {
  return names.map((name) => ({ name, value: randomMapValue(min, max) }))
}

export function buildCountryMapStats(min: number, max: number): MapStatsResponse {
  const names = MAP_PROVINCE_OPTIONS.map((p) => p.name)
  return {
    level: 'country',
    province: null,
    adcode: 100000,
    data: rowsWithRandomValues(names, min, max),
    generatedAt: new Date().toISOString(),
  }
}

export function resolveProvinceOption(query: {
  province?: string
  adcode?: string
}): { option: MapProvinceOption } | { error: string; status: number } {
  const adcodeRaw = query.adcode?.trim()
  if (adcodeRaw) {
    const adcode = Number(adcodeRaw)
    if (!Number.isFinite(adcode)) {
      return { error: 'adcode 无效', status: 400 }
    }
    const option = MAP_PROVINCE_OPTIONS.find((p) => p.adcode === adcode)
    if (!option) return { error: `未找到 adcode=${adcodeRaw} 对应省份`, status: 404 }
    return { option }
  }

  // 兼容误输入尾部逗号（如 province=辽宁省,）
  const province = query.province?.trim().replace(/[,，\s]+$/g, '')
  if (!province) {
    return { error: '省级数据需传 province（如 陕西省）或 adcode（如 610000）', status: 400 }
  }

  const option =
    MAP_PROVINCE_OPTIONS.find((p) => p.name === province) ??
    MAP_PROVINCE_OPTIONS.find((p) => p.name.replace(/省|市|自治区|壮族|回族|维吾尔|特别行政区/g, '') === province)

  if (!option) {
    return {
      error: `未找到省份「${province}」，请使用完整名称（如 陕西省、广东省）`,
      status: 404,
    }
  }
  return { option }
}

async function fetchProvinceGeoJson(adcode: number): Promise<unknown> {
  const key = String(adcode)
  const cached = geoJsonCache.get(key)
  if (cached) return cached

  const upstream = await fetch(`${MAP_GEO_UPSTREAM}/${key}_full.json`)
  if (!upstream.ok) {
    throw new Error(`地图数据上游返回 ${upstream.status}`)
  }
  const json = await upstream.json()
  geoJsonCache.set(key, json)
  return json
}

export function extractRegionNamesFromGeo(geo: unknown): string[] {
  const features = (geo as { features?: unknown[] })?.features
  if (!Array.isArray(features)) return []

  const names: string[] = []
  for (const f of features) {
    if (typeof f !== 'object' || f === null) continue
    const props = (f as { properties?: Record<string, unknown> }).properties
    const raw = props?.name ?? props?.NAME ?? props?.adname
    if (typeof raw === 'string') {
      const name = raw.trim()
      if (name) names.push(name)
    }
  }
  return [...new Set(names)]
}

async function getProvinceRegionNames(adcode: number): Promise<string[]> {
  const key = String(adcode)
  const cached = regionNamesCache.get(key)
  if (cached) return cached

  const geo = await fetchProvinceGeoJson(adcode)
  const names = extractRegionNamesFromGeo(geo)
  if (names.length === 0) {
    throw new Error('GeoJSON 中未解析到行政区名称')
  }
  regionNamesCache.set(key, names)
  return names
}

export async function buildProvinceMapStats(
  option: MapProvinceOption,
  min: number,
  max: number,
): Promise<MapStatsResponse> {
  const names = await getProvinceRegionNames(option.adcode)
  return {
    level: 'province',
    province: option.name,
    adcode: option.adcode,
    data: rowsWithRandomValues(names, min, max),
    generatedAt: new Date().toISOString(),
  }
}

export function parseMapStatsQuery(query: Record<string, unknown>): {
  level: 'country' | 'province'
  province?: string
  adcode?: string
  min: number
  max: number
} | { error: string; status: number } {
  const levelRaw = typeof query.level === 'string' ? query.level.trim().toLowerCase() : ''
  if (levelRaw !== 'country' && levelRaw !== 'province') {
    return { error: 'level 必填，取值为 country（全国各省）或 province（省内各市）', status: 400 }
  }

  const min = query.min != null ? Number(query.min) : 50
  const max = query.max != null ? Number(query.max) : 500
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { error: 'min/max 须为数字', status: 400 }
  }

  return {
    level: levelRaw,
    province: typeof query.province === 'string' ? query.province : undefined,
    adcode: typeof query.adcode === 'string' ? query.adcode : undefined,
    min,
    max,
  }
}

/** 供 map-geo 路由复用同一份 GeoJSON 缓存 */
export function cacheMapGeoJson(adcode: string, json: unknown): void {
  geoJsonCache.set(adcode, json)
}
