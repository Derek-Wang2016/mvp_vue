import { getApiBase } from './config'
import type { HmiDocument } from './types'

export interface HmiListItem {
  id: number
  name: string
  updatedAt: string
}

export async function listScreens(): Promise<HmiListItem[]> {
  const res = await fetch(`${getApiBase()}/api/hmi/screens`)
  if (!res.ok) throw new Error('list failed')
  return res.json()
}

export async function getScreen(id: number): Promise<{ id: number; name: string; schemaJson: HmiDocument }> {
  const res = await fetch(`${getApiBase()}/api/hmi/screens/${id}`)
  if (!res.ok) throw new Error('load failed')
  return res.json()
}

export async function createScreen(name: string, schemaJson: HmiDocument) {
  const res = await fetch(`${getApiBase()}/api/hmi/screens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, schemaJson }),
  })
  if (!res.ok) throw new Error('create failed')
  return res.json() as Promise<{ id: number }>
}

export async function updateScreen(id: number, name: string, schemaJson: HmiDocument) {
  const res = await fetch(`${getApiBase()}/api/hmi/screens/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, schemaJson }),
  })
  if (!res.ok) throw new Error('save failed')
  return res.json()
}

export async function deleteScreen(id: number) {
  const res = await fetch(`${getApiBase()}/api/hmi/screens/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('delete failed')
}
