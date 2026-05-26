import type { CardFieldConfig } from '@mvp-vue/schema'

export function hasConfiguredCardFields(fields: CardFieldConfig[]): boolean {
  return fields.some((f) => f.field.trim().length > 0)
}

export async function autoImportCardFieldsFromApi(opts: {
  apiUrl: string
  fixedParams: Record<string, string>
  dataListPath: string
}): Promise<CardFieldConfig[]> {
  const url = new URL(opts.apiUrl)
  for (const [k, v] of Object.entries(opts.fixedParams ?? {})) {
    if (k.trim()) url.searchParams.set(k, v)
  }
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`API 请求失败 (${res.status})`)
  const json = await res.json()

  const parts = opts.dataListPath
    .replace(/^\$\./, '')
    .split('.')
  let arr: unknown = json
  for (const p of parts) {
    if (arr && typeof arr === 'object' && p in (arr as Record<string, unknown>)) {
      arr = (arr as Record<string, unknown>)[p]
    } else {
      throw new Error(`无法在返回值中找到路径 ${opts.dataListPath}`)
    }
  }
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error('数据列表为空或格式不正确')
  }
  const first = arr[0] as Record<string, unknown>
  return Object.keys(first).map((field, i) => ({
    field,
    label: field,
    ...(i >= 3 ? { visible: false } : {}),
  }))
}
