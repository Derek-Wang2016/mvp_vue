import type { CardFieldConfig, CardArrayFilterCondition, DataSource } from '@mvp-vue/schema'
import {
  resolveByPath,
  resolveCardItem,
  resolveCombinedImportFieldNames,
} from '@mvp-vue/schema'

export interface ImportFieldWhitelistOptions {
  dataSourceWhitelist?: string[]
  componentWhitelist?: string[]
}

export function buildImportWhitelistOptions(
  componentWhitelist: unknown,
  dataSourceWhitelist?: string[],
): ImportFieldWhitelistOptions | undefined {
  const comp = Array.isArray(componentWhitelist)
    ? componentWhitelist.map((k) => String(k).trim()).filter((k) => k.length > 0)
    : []
  const ds = dataSourceWhitelist?.filter((k) => k.trim().length > 0) ?? []
  if (comp.length === 0 && ds.length === 0) return undefined
  return {
    ...(ds.length > 0 ? { dataSourceWhitelist: ds } : {}),
    ...(comp.length > 0 ? { componentWhitelist: comp } : {}),
  }
}
import { getApiBase } from './config'

export function hasConfiguredCardFields(fields: CardFieldConfig[]): boolean {
  return fields.some((f) => f.field.trim().length > 0)
}

export function autoImportCardFieldsFromSample(
  sample: Record<string, unknown>,
  whitelists?: ImportFieldWhitelistOptions,
): CardFieldConfig[] {
  const names = resolveCombinedImportFieldNames(
    sample,
    whitelists?.dataSourceWhitelist,
    whitelists?.componentWhitelist,
  )
  if (names.length === 0) {
    throw new Error('没有可导入的字段（请检查白名单或样本数据）')
  }
  return names.map((field, i) => ({
    field,
    label: field,
    ...(i >= 3 ? { visible: false } : {}),
  }))
}

async function fetchApiJson(apiUrl: string, fixedParams: Record<string, string>): Promise<unknown> {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(fixedParams ?? {})) {
    if (k.trim()) params.set(k, v)
  }
  const qs = params.toString()
  const targetUrl = apiUrl + (qs ? (apiUrl.includes('?') ? '&' : '?') + qs : '')
  const res = await fetch(`${getApiBase()}/api/data-proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: targetUrl, method: 'GET' }),
  })
  if (!res.ok) throw new Error(`API 请求失败 (${res.status})`)
  const json = await res.json()
  return json.data
}

export async function autoImportCardFieldsFromApi(opts: {
  apiUrl: string
  fixedParams: Record<string, string>
  dataListPath: string
  whitelists?: ImportFieldWhitelistOptions
}): Promise<CardFieldConfig[]> {
  const upstream = await fetchApiJson(opts.apiUrl, opts.fixedParams)
  const raw = resolveByPath(upstream, opts.dataListPath)
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('数据列表为空或格式不正确')
  }
  const first = raw[0] as Record<string, unknown>
  return autoImportCardFieldsFromSample(first, opts.whitelists)
}

export async function autoImportCardFieldsForCard(opts: {
  apiUrl: string
  fixedParams: Record<string, string>
  dataPath: string
  arrayFilters?: CardArrayFilterCondition[]
  whitelists?: ImportFieldWhitelistOptions
}): Promise<CardFieldConfig[]> {
  const upstream = await fetchApiJson(opts.apiUrl, opts.fixedParams)
  const raw = resolveByPath(upstream, opts.dataPath)
  const item = resolveCardItem(raw, opts.arrayFilters)
  if (!item) throw new Error('无法解析单条记录（路径无效、无数据或过滤无匹配）')
  return autoImportCardFieldsFromSample(item, opts.whitelists)
}

export function autoImportCardFieldsFromDataSourceSample(
  upstream: unknown,
  dataPath: string,
  arrayFilters?: CardArrayFilterCondition[],
  whitelists?: ImportFieldWhitelistOptions,
): CardFieldConfig[] {
  const raw = resolveByPath(upstream, dataPath)
  const item = resolveCardItem(raw, arrayFilters)
  if (!item) throw new Error('无法解析单条记录（路径无效、无数据或过滤无匹配）')
  return autoImportCardFieldsFromSample(item, whitelists)
}

/** 按页面数据源配置拉取 payload（与 renderer useProvideDataSources 一致） */
export async function fetchPageDataSourcePayload(ds: DataSource): Promise<unknown> {
  if (ds.type === 'static') {
    if (ds.staticData == null) throw new Error('静态数据源未配置 JSON 内容')
    return ds.staticData
  }

  if (ds.type === 'sql') {
    if (!ds.query?.trim()) throw new Error('SQL 数据源未配置查询语句')
    const res = await fetch(`${getApiBase()}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: ds.query }),
    })
    if (!res.ok) throw new Error(`查询失败 (${res.status})`)
    const json = await res.json()
    return json.data
  }

  if (!ds.url?.trim()) throw new Error('REST 数据源未配置 URL')
  const res = await fetch(`${getApiBase()}/api/data-proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: ds.url,
      method: ds.method ?? 'GET',
      headers: ds.headers,
      dataPath: ds.dataPath,
    }),
  })
  if (!res.ok) throw new Error(`API 请求失败 (${res.status})`)
  const json = await res.json()
  return json.data
}

export async function autoImportCardFieldsFromPageDataSource(
  ds: DataSource,
  dataPath: string,
  arrayFilters?: CardArrayFilterCondition[],
  componentWhitelist?: string[],
): Promise<CardFieldConfig[]> {
  const upstream = await fetchPageDataSourcePayload(ds)
  return autoImportCardFieldsFromDataSourceSample(upstream, dataPath, arrayFilters, {
    dataSourceWhitelist: ds.importFieldWhitelist,
    componentWhitelist,
  })
}

export async function autoImportCardListFieldsFromPageDataSource(
  ds: DataSource,
  dataListPath: string,
  componentWhitelist?: string[],
): Promise<CardFieldConfig[]> {
  const upstream = await fetchPageDataSourcePayload(ds)
  const raw = resolveByPath(upstream, dataListPath)
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('数据列表为空或格式不正确')
  }
  const first = raw[0] as Record<string, unknown>
  if (typeof first !== 'object' || first === null) {
    throw new Error('列表首项不是对象')
  }
  return autoImportCardFieldsFromSample(first, {
    dataSourceWhitelist: ds.importFieldWhitelist,
    componentWhitelist,
  })
}

export async function autoImportCardListFieldsFromApi(opts: {
  apiUrl: string
  fixedParams: Record<string, string>
  dataListPath: string
  whitelists?: ImportFieldWhitelistOptions
}): Promise<CardFieldConfig[]> {
  const upstream = await fetchApiJson(opts.apiUrl, opts.fixedParams)
  const raw = resolveByPath(upstream, opts.dataListPath)
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('数据列表为空或格式不正确')
  }
  const first = raw[0] as Record<string, unknown>
  return autoImportCardFieldsFromSample(first, opts.whitelists)
}
