import type { MapGeoJson } from './geo/ensureMapRegistered'
import type { MapSeriesItem } from './mapData'

export interface MapScatterPoint {
  name: string
  value: [number, number, number]
}

function asCoordPair(raw: unknown): [number, number] | null {
  if (!Array.isArray(raw) || raw.length < 2) return null
  const lng = Number(raw[0])
  const lat = Number(raw[1])
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
  return [lng, lat]
}

/** 从 GeoJSON features 提取 name → [lng, lat]（优先 center，其次 centroid） */
export function buildGeoCoordMap(geoJson: MapGeoJson): Record<string, [number, number]> {
  const map: Record<string, [number, number]> = {}
  const features = (geoJson as { features?: unknown[] }).features
  if (!Array.isArray(features)) return map

  for (const raw of features) {
    if (typeof raw !== 'object' || raw === null) continue
    const feature = raw as { properties?: Record<string, unknown> }
    const props = feature.properties
    if (!props || typeof props.name !== 'string') continue
    const coord = asCoordPair(props.center) ?? asCoordPair(props.centroid)
    if (coord) map[props.name] = coord
  }
  return map
}

/** 将业务数据转为 geo 散点 series data（匹配失败则跳过） */
export function toScatterData(
  items: MapSeriesItem[],
  coordMap: Record<string, [number, number]>,
): MapScatterPoint[] {
  const points: MapScatterPoint[] = []
  const missing: string[] = []

  for (const item of items) {
    const coord = coordMap[item.name]
    if (!coord) {
      missing.push(item.name)
      continue
    }
    points.push({
      name: item.name,
      value: [coord[0], coord[1], item.value],
    })
  }

  if (missing.length > 0 && import.meta.env.DEV) {
    console.warn('[MapRenderer] 未匹配到地图坐标的地名:', missing.join('、'))
  }

  return points
}

export function scatterSymbolSize(
  value: unknown,
  symbolSizeByValue: boolean,
  fixedSize: number,
  minSize: number,
  maxSize: number,
  maxVal: number,
): number {
  if (!symbolSizeByValue) return fixedSize
  const arr = Array.isArray(value) ? value : []
  const metric = Number(arr[2])
  if (!Number.isFinite(metric) || maxVal <= 0) return fixedSize
  const t = Math.min(1, Math.max(0, metric / maxVal))
  return minSize + t * (maxSize - minSize)
}
