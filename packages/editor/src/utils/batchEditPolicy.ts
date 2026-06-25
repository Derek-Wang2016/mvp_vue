import type { ComponentType } from '@mvp-vue/schema'

/** 图标来源相关 props（批量编辑时不可改） */
export const ICON_SOURCE_PROP_KEYS = [
  'iconType',
  'iconName',
  'iconSvg',
  'savedIconId',
  'iconPreset',
  'iconUrl',
] as const

/** 数据绑定 / 字段映射类 props */
const DATA_BINDING_PROP_KEYS = [
  'categoryField',
  'valueField',
  'nameField',
  'textField',
  'dataPath',
  'dataListPath',
  'dataTotalPath',
  'importFieldWhitelist',
  'arrayFilters',
] as const

/** 各组件类型在批量编辑时禁止写入的 props */
const BATCH_EXCLUDED_PROPS_BY_TYPE: Partial<Record<ComponentType, readonly string[]>> = {
  text: ['content', 'separator', 'maxRows', 'textField'],
  image: ['src'],
  icon: [...ICON_SOURCE_PROP_KEYS, 'caption'],
  'bar-chart': ['title', ...DATA_BINDING_PROP_KEYS],
  'line-chart': ['title', ...DATA_BINDING_PROP_KEYS],
  'pie-chart': ['title', ...DATA_BINDING_PROP_KEYS],
  'page-nav-button': ['label', 'targetPageId', ...ICON_SOURCE_PROP_KEYS],
  map: ['title', ...DATA_BINDING_PROP_KEYS],
  card: [
    'fields',
    'apiUrl',
    'fixedParams',
    'refreshInterval',
    'emptyDisplay',
    'dataPath',
    ...DATA_BINDING_PROP_KEYS,
  ],
  'card-list': [
    'fields',
    'apiUrl',
    'fixedParams',
    'refreshInterval',
    'pageSize',
    'pageFlipInterval',
    'emptyDisplay',
    ...DATA_BINDING_PROP_KEYS,
  ],
  'key-value-tag': ['items'],
}

export function getBatchExcludedPropKeys(type: ComponentType): Set<string> {
  return new Set(BATCH_EXCLUDED_PROPS_BY_TYPE[type] ?? [])
}

/** 过滤批量模式下不允许写入的 props 键 */
export function filterBatchPropsPatch(
  type: ComponentType,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const excluded = getBatchExcludedPropKeys(type)
  const filtered: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(patch)) {
    if (!excluded.has(key)) filtered[key] = val
  }
  return filtered
}
