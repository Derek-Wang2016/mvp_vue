function isFieldValueEmpty(raw: unknown): boolean {
  if (raw == null) return true
  if (typeof raw === 'string') return raw.trim() === ''
  return false
}

export type CardArrayFilterOperator =
  | 'eq'
  | 'ne'
  | 'contains'
  | 'notContains'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'empty'
  | 'notEmpty'

export interface CardArrayFilterCondition {
  field: string
  operator: CardArrayFilterOperator
  value?: string
}

export const CARD_ARRAY_FILTER_OPERATORS: { value: CardArrayFilterOperator; label: string }[] = [
  { value: 'eq', label: '等于' },
  { value: 'ne', label: '不等于' },
  { value: 'contains', label: '包含' },
  { value: 'notContains', label: '不包含' },
  { value: 'gt', label: '大于' },
  { value: 'gte', label: '大于等于' },
  { value: 'lt', label: '小于' },
  { value: 'lte', label: '小于等于' },
  { value: 'empty', label: '为空' },
  { value: 'notEmpty', label: '不为空' },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asRecordArray(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is Record<string, unknown> => isRecord(x))
}

/** 从根对象按点路径取值（与 CardListRenderer.resolveByPath 语义一致） */
export function resolveByPath(obj: unknown, path: string): unknown {
  const trimmed = path.trim()
  if (!trimmed) return obj
  const segments = trimmed.replace(/^\$\./, '').split('.').filter((s) => s.length > 0)
  let current: unknown = obj
  for (const seg of segments) {
    if (current == null || typeof current !== 'object') return null
    current = (current as Record<string, unknown>)[seg]
  }
  return current
}

function compareScalar(left: string, right: string, op: 'gt' | 'gte' | 'lt' | 'lte'): boolean {
  const ln = Number(left)
  const rn = Number(right)
  if (Number.isFinite(ln) && Number.isFinite(rn)) {
    if (op === 'gt') return ln > rn
    if (op === 'gte') return ln >= rn
    if (op === 'lt') return ln < rn
    return ln <= rn
  }
  if (op === 'gt') return left > right
  if (op === 'gte') return left >= right
  if (op === 'lt') return left < right
  return left <= right
}

function evaluateCondition(item: Record<string, unknown>, cond: CardArrayFilterCondition): boolean {
  const field = cond.field.trim()
  if (!field) return true

  const raw = item[field]
  const left = String(raw ?? '').trim()
  const right = String(cond.value ?? '').trim()

  switch (cond.operator) {
    case 'empty':
      return isFieldValueEmpty(raw)
    case 'notEmpty':
      return !isFieldValueEmpty(raw)
    case 'eq':
      return left === right
    case 'ne':
      return left !== right
    case 'contains':
      return left.includes(right)
    case 'notContains':
      return !left.includes(right)
    case 'gt':
      return compareScalar(left, right, 'gt')
    case 'gte':
      return compareScalar(left, right, 'gte')
    case 'lt':
      return compareScalar(left, right, 'lt')
    case 'lte':
      return compareScalar(left, right, 'lte')
    default:
      return true
  }
}

/** 有效过滤条件（field 非空） */
export function getActiveCardArrayFilters(
  filters: CardArrayFilterCondition[] | undefined,
): CardArrayFilterCondition[] {
  if (!filters?.length) return []
  return filters.filter((c) => c.field.trim().length > 0)
}

/** 单条记录是否满足全部过滤条件（AND） */
export function matchCardArrayItem(
  item: Record<string, unknown>,
  filters: CardArrayFilterCondition[],
): boolean {
  const active = getActiveCardArrayFilters(filters)
  if (active.length === 0) return true
  return active.every((c) => evaluateCondition(item, c))
}

/**
 * 将 dataPath 解析结果规范为单条记录：
 * - Record → 直接返回
 * - Array → 有 filters 时取第一条 AND 匹配；无 filters 时取 [0]
 * - 其它 → null
 */
export function resolveCardItem(
  raw: unknown,
  filters: CardArrayFilterCondition[] | undefined,
): Record<string, unknown> | null {
  if (isRecord(raw)) return raw

  const arr = asRecordArray(raw)
  if (arr.length === 0) return null

  const active = getActiveCardArrayFilters(filters)
  if (active.length === 0) return arr[0] ?? null

  for (const item of arr) {
    if (matchCardArrayItem(item, filters ?? [])) return item
  }
  return null
}
