import { getApiBase } from './config'

export interface EditableTextRow {
  key: string
  content: string
  updatedAt: string
}

function rowUrl(key: string): string {
  return `${getApiBase()}/api/editable-texts/${encodeURIComponent(key.trim())}`
}

export async function fetchEditableText(key: string): Promise<EditableTextRow | null> {
  const res = await fetch(rowUrl(key))
  if (res.status === 404) return null
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error ?? `读取失败: ${res.status}`)
  }
  return res.json() as Promise<EditableTextRow>
}

export async function saveEditableText(key: string, content: string): Promise<EditableTextRow> {
  const res = await fetch(rowUrl(key), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error ?? `保存失败: ${res.status}`)
  }
  return res.json() as Promise<EditableTextRow>
}
