import type { CustomIconListItem, CustomIconRecord, PageSchema } from '@mvp-vue/schema'
import { getApiBase } from './config'
import type { PageScope } from './pagePolicy'

const BASE = `${getApiBase()}/api`

export type { CustomIconListItem, CustomIconRecord, PageScope }

async function throwPageApiError(res: Response, fallback: string): Promise<never> {
  const err = await res.json().catch(() => ({})) as { error?: string }
  throw new Error(err.error ?? fallback)
}

function pagesBase(scope: PageScope): string {
  return scope === 'draft' ? `${BASE}/draft/pages` : `${BASE}/publish/pages`
}

export async function listCustomIcons(includeSvg = true): Promise<CustomIconListItem[]> {
  const q = includeSvg ? '?includeSvg=1' : ''
  const res = await fetch(`${BASE}/custom-icons${q}`)
  if (!res.ok) throw new Error('加载图标库失败')
  return res.json() as Promise<CustomIconListItem[]>
}

export async function getCustomIcon(id: number): Promise<CustomIconRecord> {
  const res = await fetch(`${BASE}/custom-icons/${id}`)
  if (!res.ok) throw new Error('图标不存在')
  return res.json() as Promise<CustomIconRecord>
}

export async function createCustomIcon(name: string, svgContent: string): Promise<CustomIconRecord> {
  const res = await fetch(`${BASE}/custom-icons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, svgContent }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error ?? '保存图标失败')
  }
  return res.json() as Promise<CustomIconRecord>
}

export async function updateCustomIcon(
  id: number,
  patch: { name?: string; svgContent?: string },
): Promise<CustomIconRecord> {
  const res = await fetch(`${BASE}/custom-icons/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error ?? '更新图标失败')
  }
  return res.json() as Promise<CustomIconRecord>
}

export async function deleteCustomIcon(id: number): Promise<void> {
  const res = await fetch(`${BASE}/custom-icons/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除图标失败')
}

export interface PageListItem {
  id: number
  name: string
  createdAt: string
}

export async function listPages(scope: PageScope) {
  const res = await fetch(pagesBase(scope))
  if (!res.ok) throw new Error('List failed')
  return res.json() as Promise<PageListItem[]>
}

export async function savePage(scope: PageScope, name: string, schemaJson: PageSchema) {
  const res = await fetch(pagesBase(scope), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, schemaJson }),
  })
  if (!res.ok) await throwPageApiError(res, '保存失败')
  return res.json() as Promise<{ id: number }>
}

export async function updatePage(scope: PageScope, id: number, name: string, schemaJson: PageSchema) {
  const res = await fetch(`${pagesBase(scope)}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, schemaJson }),
  })
  if (!res.ok) await throwPageApiError(res, '更新失败')
  return res.json()
}

export async function getPage(scope: PageScope, id: number) {
  const res = await fetch(`${pagesBase(scope)}/${id}`)
  if (!res.ok) throw new Error('Page not found')
  return res.json() as Promise<{ id: number; name: string; schemaJson: PageSchema }>
}

export async function deletePage(scope: PageScope, id: number) {
  const res = await fetch(`${pagesBase(scope)}/${id}`, { method: 'DELETE' })
  if (!res.ok) await throwPageApiError(res, '删除失败')
}

/** 完整复制页面（深拷贝 schema，同表） */
export async function copyPage(scope: PageScope, sourceId: number, name?: string) {
  const source = await getPage(scope, sourceId)
  const schemaJson = JSON.parse(JSON.stringify(source.schemaJson)) as PageSchema
  const copyName = name?.trim() || `${source.name} 副本`
  return savePage(scope, copyName, schemaJson)
}

/** 仅修改页面名称 */
export async function renamePage(scope: PageScope, id: number, name: string) {
  const page = await getPage(scope, id)
  return updatePage(scope, id, name.trim(), page.schemaJson)
}

/** 从调试表发布到发布表 */
export async function promotePageFromDraft(
  draftId: number,
  options?: { name?: string; publishId?: number },
) {
  const res = await fetch(`${BASE}/publish/pages/from-draft/${draftId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options ?? {}),
  })
  if (!res.ok) await throwPageApiError(res, '发布失败')
  return res.json() as Promise<{ id: number; name: string; schemaJson: PageSchema }>
}
