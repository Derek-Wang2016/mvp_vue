import * as echarts from 'echarts'
import {
  type MapLevel,
  getMapEchartsKey,
  CHINA_COUNTRY_ADCODE,
} from '@mvp-vue/schema'
import chinaJson from './china.json'
import { getApiBase } from '../../config'

export const CHINA_MAP_KEY = 'china'

export type MapGeoJson = Parameters<typeof echarts.registerMap>[1]

export interface RegisteredMapResult {
  mapKey: string
  geoJson: MapGeoJson
}

const registered = new Set<string>()
const geoJsonCache = new Map<string, MapGeoJson>()
const pending = new Map<string, Promise<RegisteredMapResult>>()

function cacheAndRegister(key: string, geoJson: MapGeoJson): RegisteredMapResult {
  if (!registered.has(key)) {
    echarts.registerMap(key, geoJson)
    registered.add(key)
  }
  geoJsonCache.set(key, geoJson)
  return { mapKey: key, geoJson }
}

function registerCountryMap(): RegisteredMapResult {
  return cacheAndRegister(CHINA_MAP_KEY, chinaJson as MapGeoJson)
}

async function registerProvinceMap(adcode: number): Promise<RegisteredMapResult> {
  const key = getMapEchartsKey('province', adcode)
  const cached = geoJsonCache.get(key)
  if (cached && registered.has(key)) {
    return { mapKey: key, geoJson: cached }
  }

  const res = await fetch(`${getApiBase()}/api/map-geo/${adcode}`)
  if (!res.ok) {
    let detail = ''
    try {
      const err = (await res.json()) as { error?: string }
      detail = err.error ? `: ${err.error}` : ''
    } catch {
      /* ignore */
    }
    throw new Error(`省级地图加载失败 (${adcode})${detail}`)
  }
  const json = (await res.json()) as MapGeoJson
  return cacheAndRegister(key, json)
}

/** 按层级注册 ECharts 地图并返回 GeoJSON（供散点坐标解析） */
export async function ensureMapRegistered(
  level: MapLevel,
  adcode: number,
): Promise<RegisteredMapResult> {
  const key = getMapEchartsKey(level, adcode)
  const cachedJson = geoJsonCache.get(key)
  if (cachedJson && registered.has(key)) {
    return { mapKey: key, geoJson: cachedJson }
  }

  const existing = pending.get(key)
  if (existing) return existing

  const task = (async (): Promise<RegisteredMapResult> => {
    if (level === 'country' || adcode === CHINA_COUNTRY_ADCODE) {
      return registerCountryMap()
    }
    return registerProvinceMap(adcode)
  })()

  pending.set(key, task)
  try {
    return await task
  } finally {
    pending.delete(key)
  }
}

/** @deprecated 使用 ensureMapRegistered */
export async function registerChinaMap() {
  const { mapKey } = await ensureMapRegistered('country', CHINA_COUNTRY_ADCODE)
  return mapKey
}
