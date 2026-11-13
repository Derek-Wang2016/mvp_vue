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

export interface HmiSampleSource {
  id: number
  name: string
  mode: 'json' | 'http'
  method: 'GET' | 'POST'
  url: string
  body: string
  paramsJson: string
  sampleJson: string
  active: boolean
  updatedAt: string
}

export type HmiSampleDraft = Omit<HmiSampleSource, 'id' | 'active' | 'updatedAt'>

export async function listSampleSources(): Promise<HmiSampleSource[]> {
  const res = await fetch(`${getApiBase()}/api/hmi/sample-sources`)
  if (!res.ok) throw new Error('无法读取样例')
  return res.json() as Promise<HmiSampleSource[]>
}

export async function createSampleSource(draft: HmiSampleDraft): Promise<HmiSampleSource> {
  const res = await fetch(`${getApiBase()}/api/hmi/sample-sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  })
  const json = await res.json().catch(() => ({})) as HmiSampleSource & { error?: string }
  if (!res.ok) throw new Error(json.error ?? '保存失败')
  return json
}

export async function updateSampleSource(id: number, draft: HmiSampleDraft): Promise<HmiSampleSource> {
  const res = await fetch(`${getApiBase()}/api/hmi/sample-sources/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  })
  const json = await res.json().catch(() => ({})) as HmiSampleSource & { error?: string }
  if (!res.ok) throw new Error(json.error ?? '保存失败')
  return json
}

export async function testSampleRequest(draft: Pick<HmiSampleDraft, 'method' | 'url' | 'body' | 'paramsJson'>): Promise<{ request: { method: string; url: string; body?: string }; status: number; data: unknown }> {
  const res = await fetch(`${getApiBase()}/api/hmi/sample-sources/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  })
  const json = await res.json().catch(() => ({})) as { request?: { method: string; url: string; body?: string }; status?: number; data?: unknown; error?: string }
  if (!res.ok || !json.request) throw new Error(json.error ?? '测试失败')
  return { request: json.request, status: json.status ?? res.status, data: json.data }
}

export async function activateSampleSource(id: number): Promise<unknown> {
  const res = await fetch(`${getApiBase()}/api/hmi/sample-sources/${id}/activate`, { method: 'POST' })
  const json = await res.json().catch(() => ({})) as { data?: unknown; error?: string }
  if (!res.ok) throw new Error(json.error ?? '激活失败')
  return json.data
}

export async function deleteSampleSource(id: number) {
  const res = await fetch(`${getApiBase()}/api/hmi/sample-sources/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除失败')
}

export interface HostedImageItem {
  id: number
  name: string
  mime: string
  url: string
  createdAt: string
}

export interface HmiFileItem {
  id: number
  name: string
  mime: string
  size: number
  sha256: string
  url: string
  createdAt?: string
}

export async function listHmiFiles(): Promise<HmiFileItem[]> {
  const res = await fetch(`${getApiBase()}/api/hmi/files`)
  if (!res.ok) throw new Error('加载图片失败')
  return res.json() as Promise<HmiFileItem[]>
}

export async function uploadHmiFile(file: File): Promise<HmiFileItem> {
  const body = new FormData()
  body.append('file', file)
  const res = await fetch(`${getApiBase()}/api/hmi/files`, { method: 'POST', body })
  const json = await res.json().catch(() => ({})) as HmiFileItem & { error?: string }
  if (!res.ok || !json.url) throw new Error(json.error ?? '上传失败')
  return json
}

export async function deleteHmiFile(id: number) {
  const res = await fetch(`${getApiBase()}/api/hmi/files/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const json = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(json.error ?? '删除失败')
  }
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
