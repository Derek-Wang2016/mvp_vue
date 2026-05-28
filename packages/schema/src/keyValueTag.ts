/** 解析 KEY-VALUE-TAG 的 KEY 筛选列表（去空白、去空串） */
export function parseKeyValueTagKeyList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map((k) => String(k).trim()).filter((k) => k.length > 0)
}

/**
 * 按 visibleKeys / hiddenKeys 筛选 KV 项。
 * - visibleKeys 为空：先取全部
 * - visibleKeys 非空：仅保留白名单并按其顺序
 * - hiddenKeys 非空：排除黑名单；与 visibleKeys 冲突时以 hiddenKeys 为准
 */
export function filterKeyValueTagItems<T extends { key: string }>(
  items: T[],
  visibleKeys: unknown,
  hiddenKeys: unknown,
): T[] {
  const allow = parseKeyValueTagKeyList(visibleKeys)
  const hidden = new Set(parseKeyValueTagKeyList(hiddenKeys))
  const dropHidden = (list: T[]) => list.filter((item) => !hidden.has(item.key))

  if (allow.length === 0) return dropHidden(items)

  const byKey = new Map(items.map((item) => [item.key, item]))
  const ordered = allow
    .map((k) => byKey.get(k))
    .filter((item): item is T => item != null)
  return dropHidden(ordered)
}
