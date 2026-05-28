import type { PageSchema } from '@mvp-vue/schema'
import { getApiBase } from './config'

const BASE = `${getApiBase()}/api`

export interface PageListItem {
  id: number
  name: string
  createdAt: string
}

export async function listPages() {
  const res = await fetch(`${BASE}/pages`)
  if (!res.ok) throw new Error('List failed')
  return res.json() as Promise<PageListItem[]>
}

export async function savePage(name: string, schemaJson: PageSchema) {
  const res = await fetch(`${BASE}/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, schemaJson }),
  })
  if (!res.ok) throw new Error('Save failed')
  return res.json() as Promise<{ id: number }>
}

export async function updatePage(id: number, name: string, schemaJson: PageSchema) {
  const res = await fetch(`${BASE}/pages/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, schemaJson }),
  })
  if (!res.ok) throw new Error('Update failed')
  return res.json()
}

export async function getPage(id: number) {
  const res = await fetch(`${BASE}/pages/${id}`)
  if (!res.ok) throw new Error('Page not found')
  return res.json() as Promise<{ id: number; name: string; schemaJson: PageSchema }>
}

export async function deletePage(id: number) {
  const res = await fetch(`${BASE}/pages/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Delete failed')
}

/** 完整复制页面（深拷贝 schema） */
export async function copyPage(sourceId: number, name?: string) {
  const source = await getPage(sourceId)
  const schemaJson = JSON.parse(JSON.stringify(source.schemaJson)) as PageSchema
  const copyName = name?.trim() || `${source.name} 副本`
  return savePage(copyName, schemaJson)
}

/** 仅修改页面名称 */
export async function renamePage(id: number, name: string) {
  const page = await getPage(id)
  return updatePage(id, name.trim(), page.schemaJson)
}
