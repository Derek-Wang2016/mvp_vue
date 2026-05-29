/** 解析数据源「字段导入白名单」（去空白、去空串） */
export function parseImportFieldWhitelist(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map((k) => String(k).trim()).filter((k) => k.length > 0)
}

/**
 * 决定从样本对象导入哪些字段名。
 * - whitelist 为空：使用 sample 的全部键（Object.keys 顺序）
 * - whitelist 非空：仅白名单中的字段，按白名单顺序（样本中不存在的键仍会导入，便于先配布局）
 */
export function resolveImportFieldNames(
  sample: Record<string, unknown>,
  whitelist: unknown,
): string[] {
  const allow = parseImportFieldWhitelist(whitelist)
  if (allow.length === 0) return Object.keys(sample)
  return allow
}

/**
 * 数据源白名单 + 组件白名单叠加（用于「导入字段」）：
 * 1. 先按数据源白名单从 sample 收窄（空=全部键）
 * 2. 再按组件白名单收窄（空=保持上一步；非空=按组件列表顺序，且须在第一步结果内；无交集时仍用组件列表便于先配布局）
 */
export function resolveCombinedImportFieldNames(
  sample: Record<string, unknown>,
  dataSourceWhitelist: unknown,
  componentWhitelist: unknown,
): string[] {
  const afterDs = resolveImportFieldNames(sample, dataSourceWhitelist)
  const compAllow = parseImportFieldWhitelist(componentWhitelist)
  if (compAllow.length === 0) return afterDs

  const dsSet = new Set(afterDs)
  const intersected = compAllow.filter((k) => dsSet.has(k))
  return intersected.length > 0 ? intersected : compAllow
}
