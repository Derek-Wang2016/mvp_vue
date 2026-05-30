function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 解析图表数据过滤值列表（去空白、去空串） */
export function parseChartFilterValues(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map((v) => String(v).trim()).filter((v) => v.length > 0)
}

/** 将原始数据规范为数组（图表数据源通常为 KEY-VALUE 对象数组） */
export function asChartRowArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).data)) {
    return (raw as Record<string, unknown>).data as unknown[]
  }
  return []
}

/**
 * 按字段值白名单过滤图表数据行（OR）。
 * - filterField 为空或 filterValues 为空：不过滤，返回全部行
 * - 否则仅保留 item[filterField] 精确匹配（trim 后）白名单中任一项的行
 */
export function filterChartArrayRows(
  raw: unknown,
  filterField: unknown,
  filterValues: unknown,
): unknown[] {
  const arr = asChartRowArray(raw)
  if (arr.length === 0) return arr

  const field = typeof filterField === 'string' ? filterField.trim() : ''
  const allowed = new Set(parseChartFilterValues(filterValues))
  if (!field || allowed.size === 0) return arr

  return arr.filter((item) => {
    if (!isRecord(item)) return false
    return allowed.has(String(item[field] ?? '').trim())
  })
}
