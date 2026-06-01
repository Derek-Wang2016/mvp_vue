import type { PrismaClient } from '@prisma/client'

export class PageScopeError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 403) {
    super(message)
    this.statusCode = statusCode
  }
}

export type PageScope = 'draft' | 'publish'

export function isStrictPagePolicy(): boolean {
  return process.env.PAGE_POLICY === 'strict'
}

/** strict 下禁止写调试表 */
export function assertDraftWritable(): void {
  if (isStrictPagePolicy()) {
    throw new PageScopeError('发布环境下调试页面不可修改')
  }
}

/** 发布表在 strict / 非 strict 下均可写 */
export function assertPublishWritable(): void {
  // 当前设计：两环境下发布表均可写
}

export function parsePageId(raw: string): number {
  const id = Number(raw)
  if (!Number.isFinite(id) || id <= 0 || !Number.isInteger(id)) {
    throw new PageScopeError('无效的页面 ID', 400)
  }
  return id
}

export async function allocatePublishId(
  prisma: PrismaClient,
  minId = 100,
): Promise<number> {
  const row = await prisma.pagePublished.aggregate({ _max: { id: true } })
  const maxId = row._max.id ?? 0
  return Math.max(minId, maxId + 1)
}
