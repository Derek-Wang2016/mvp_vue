import type { PageSchema } from '@mvp-vue/schema'
import { getApiBase } from './config'

const BASE = getApiBase()

export async function getPage(id: number): Promise<{ id: number; name: string; schemaJson: PageSchema }> {
  const res = await fetch(`${BASE}/api/publish/pages/${id}`)
  if (!res.ok) throw new Error(`加载失败: ${res.status}`)
  return res.json()
}
