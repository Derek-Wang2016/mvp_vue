import type { CardEmptyDisplayConfig, IconDictEntry, PageComponent, PageSchema } from './index'

export interface CustomIconRecord {
  id: number
  name: string
  svgContent: string
  createdAt: string
  updatedAt: string
}

/** GET /api/custom-icons 列表项；includeSvg=1 时含 svgContent */
export interface CustomIconListItem {
  id: number
  name: string
  svgContent?: string
  createdAt: string
  updatedAt: string
}

export function savedIconsToMap(icons: CustomIconRecord[] | undefined): Map<number, CustomIconRecord> {
  const map = new Map<number, CustomIconRecord>()
  if (!icons?.length) return map
  for (const icon of icons) map.set(icon.id, icon)
  return map
}

/** 收集页面中引用的已保存图标 id（iconDict + 组件内联配置） */
export function collectReferencedSavedIconIds(
  iconDict: IconDictEntry[] | undefined,
  components: PageComponent[],
): Set<number> {
  const ids = new Set<number>()
  for (const entry of iconDict ?? []) {
    if (entry.iconType === 'saved' && entry.savedIconId != null) ids.add(entry.savedIconId)
  }
  for (const comp of components) {
    collectSavedIdsFromUnknown(comp.props, ids)
    const empty = comp.props.emptyDisplay as CardEmptyDisplayConfig | undefined
    if (empty?.iconType === 'saved' && empty.savedIconId != null) ids.add(empty.savedIconId)
  }
  return ids
}

function collectSavedIdsFromUnknown(obj: unknown, ids: Set<number>): void {
  if (!obj || typeof obj !== 'object') return
  if (Array.isArray(obj)) {
    for (const item of obj) collectSavedIdsFromUnknown(item, ids)
    return
  }
  const rec = obj as Record<string, unknown>
  if (rec.iconType === 'saved' && typeof rec.savedIconId === 'number') ids.add(rec.savedIconId)
  for (const v of Object.values(rec)) collectSavedIdsFromUnknown(v, ids)
}

export function buildSavedIconsSnapshot(
  pool: CustomIconRecord[],
  referencedIds: Set<number>,
): CustomIconRecord[] | undefined {
  if (referencedIds.size === 0) return undefined
  const out: CustomIconRecord[] = []
  const map = savedIconsToMap(pool)
  for (const id of referencedIds) {
    const hit = map.get(id)
    if (hit) out.push(hit)
  }
  return out.length > 0 ? out : undefined
}

export function mergeSavedIconIntoPool(
  pool: CustomIconRecord[],
  record: CustomIconRecord,
): CustomIconRecord[] {
  const idx = pool.findIndex((i) => i.id === record.id)
  if (idx >= 0) {
    const next = [...pool]
    next[idx] = record
    return next
  }
  return [...pool, record]
}

export function listItemToRecord(item: CustomIconListItem): CustomIconRecord | null {
  if (!item.svgContent) return null
  return {
    id: item.id,
    name: item.name,
    svgContent: item.svgContent,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

/** 属性面板 / 选择器按钮文案 */
export function iconEntryPickerLabel(entry: Pick<IconDictEntry, 'iconType' | 'iconName' | 'savedIconId'>, savedName?: string): string {
  if (entry.iconType === 'preset') return entry.iconName ?? '选择...'
  if (entry.iconType === 'saved') return savedName ? `库: ${savedName}` : `已保存 #${entry.savedIconId ?? '?'}`
  return '内联 SVG'
}

export function collectSavedIconsFromSchema(schema: PageSchema): CustomIconRecord[] {
  return schema.savedIcons ? [...schema.savedIcons] : []
}
