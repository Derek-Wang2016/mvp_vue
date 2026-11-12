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

export interface HmiPublicationItem {
  id: number
  description: string
  screenId: number | null
  status: 'active' | 'paused'
  updatedAt: string
}

export function publicationUrl(id: number): string {
  return `${getApiBase()}/api/hmi/publications/${id}`
}

export async function listPublications(): Promise<HmiPublicationItem[]> {
  const res = await fetch(`${getApiBase()}/api/hmi/publications`)
  if (!res.ok) throw new Error('list failed')
  return res.json()
}

export async function createPublication(description: string, schemaJson: unknown, screenId: number | null) {
  const res = await fetch(`${getApiBase()}/api/hmi/publications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, schemaJson, screenId }),
  })
  if (!res.ok) throw new Error('publish failed')
  return res.json() as Promise<HmiPublicationItem>
}

export async function updatePublication(id: number, patch: { description?: string; schemaJson?: unknown; status?: 'active' | 'paused' }) {
  const res = await fetch(`${getApiBase()}/api/hmi/publications/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error('update failed')
  return res.json() as Promise<HmiPublicationItem & { unchanged?: boolean }>
}

export async function deletePublication(id: number) {
  const res = await fetch(`${getApiBase()}/api/hmi/publications/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('delete failed')
}

export async function deleteScreen(id: number) {
  const res = await fetch(`${getApiBase()}/api/hmi/screens/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('delete failed')
}

export interface HostedImageItem {
  id: number
  name: string
  mime: string
  url: string
  createdAt: string
}

export function hostedImageUrl(id: number): string {
  return `${getApiBase()}/api/images/${id}`
}

export async function listHostedImages(): Promise<HostedImageItem[]> {
  const res = await fetch(`${getApiBase()}/api/images`)
  if (!res.ok) throw new Error('加载图片库失败')
  return res.json() as Promise<HostedImageItem[]>
}

export async function uploadHostedImage(name: string, dataUrl: string): Promise<HostedImageItem> {
  const res = await fetch(`${getApiBase()}/api/images`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, dataUrl }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error ?? '上传失败')
  }
  return res.json() as Promise<HostedImageItem>
}

export async function deleteHostedImage(id: number): Promise<void> {
  const res = await fetch(`${getApiBase()}/api/images/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error ?? '删除失败')
  }
}
