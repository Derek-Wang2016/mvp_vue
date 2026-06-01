import type { PrismaClient } from '@prisma/client'
import type { CustomIconListItem, CustomIconRecord } from '@mvp-vue/schema'

const MAX_SVG_BYTES = 64 * 1024

const UNSAFE_SVG_PATTERNS = [
  /<script[\s>]/i,
  /javascript:/i,
  /\bon[a-z]+\s*=/i,
  /<foreignObject[\s>]/i,
  /<iframe[\s>]/i,
]

export type CustomIconValidationError = {
  field: 'name' | 'svgContent'
  message: string
}

export function validateCustomIconInput(input: {
  name?: unknown
  svgContent?: unknown
}): CustomIconValidationError | null {
  if (input.name !== undefined) {
    const name = typeof input.name === 'string' ? input.name.trim() : ''
    if (!name) {
      return { field: 'name', message: 'name 不能为空' }
    }
    if (name.length > 64) {
      return { field: 'name', message: 'name 最长 64 字符' }
    }
  }

  if (input.svgContent !== undefined) {
    const svgContent = typeof input.svgContent === 'string' ? input.svgContent.trim() : ''
    if (!svgContent) {
      return { field: 'svgContent', message: 'svgContent 不能为空' }
    }
    if (Buffer.byteLength(svgContent, 'utf8') > MAX_SVG_BYTES) {
      return { field: 'svgContent', message: `svgContent 不能超过 ${MAX_SVG_BYTES} 字节` }
    }
    if (!/^<svg[\s>]/i.test(svgContent) || !/<\/svg>\s*$/i.test(svgContent)) {
      return { field: 'svgContent', message: 'svgContent 必须是完整的 <svg>...</svg> 片段' }
    }
    for (const pattern of UNSAFE_SVG_PATTERNS) {
      if (pattern.test(svgContent)) {
        return { field: 'svgContent', message: 'svgContent 包含不允许的内容（script / 事件处理器等）' }
      }
    }
  }

  return null
}

function toRecord(row: {
  id: number
  name: string
  svgContent: string
  createdAt: Date
  updatedAt: Date
}): CustomIconRecord {
  return {
    id: row.id,
    name: row.name,
    svgContent: row.svgContent,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function toListItem(row: {
  id: number
  name: string
  createdAt: Date
  updatedAt: Date
}): CustomIconListItem {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function listCustomIcons(
  prisma: PrismaClient,
  options?: { includeSvg?: boolean },
): Promise<CustomIconRecord[] | CustomIconListItem[]> {
  const rows = await prisma.customIcon.findMany({
    orderBy: { updatedAt: 'desc' },
    select: options?.includeSvg
      ? { id: true, name: true, svgContent: true, createdAt: true, updatedAt: true }
      : { id: true, name: true, createdAt: true, updatedAt: true },
  })

  if (options?.includeSvg) {
    return rows.map((row) => toRecord(row as typeof rows[number] & { svgContent: string }))
  }
  return rows.map(toListItem)
}

export async function getCustomIconById(
  prisma: PrismaClient,
  id: number,
): Promise<CustomIconRecord | null> {
  const row = await prisma.customIcon.findUnique({ where: { id } })
  return row ? toRecord(row) : null
}

export async function createCustomIcon(
  prisma: PrismaClient,
  input: { name: string; svgContent: string },
): Promise<CustomIconRecord> {
  const row = await prisma.customIcon.create({
    data: {
      name: input.name.trim(),
      svgContent: input.svgContent.trim(),
    },
  })
  return toRecord(row)
}

export async function updateCustomIcon(
  prisma: PrismaClient,
  id: number,
  input: { name?: string; svgContent?: string },
): Promise<CustomIconRecord | null> {
  const existing = await prisma.customIcon.findUnique({ where: { id } })
  if (!existing) return null

  const row = await prisma.customIcon.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.svgContent !== undefined ? { svgContent: input.svgContent.trim() } : {}),
    },
  })
  return toRecord(row)
}

export async function deleteCustomIcon(prisma: PrismaClient, id: number): Promise<boolean> {
  const existing = await prisma.customIcon.findUnique({ where: { id } })
  if (!existing) return false
  await prisma.customIcon.delete({ where: { id } })
  return true
}
