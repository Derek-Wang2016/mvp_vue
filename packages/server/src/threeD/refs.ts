import type { PrismaClient } from '@prisma/client'

export async function categoryRefError(
  prisma: PrismaClient,
  categoryId: number | null | undefined,
): Promise<string | null> {
  if (categoryId == null) return null
  const row = await prisma.modelCategory.findUnique({ where: { id: categoryId } })
  return row ? null : '分类不存在'
}

export async function modelFileError(
  prisma: PrismaClient,
  fileId: number | null | undefined,
): Promise<string | null> {
  if (fileId == null) return null
  const row = await prisma.assetFile.findUnique({ where: { id: fileId } })
  if (!row) return '文件不存在'
  if (row.mime !== 'model/gltf-binary') return 'fileId 必须是 GLB 文件'
  return null
}

export async function thumbnailRefError(
  prisma: PrismaClient,
  fileId: number | null | undefined,
): Promise<string | null> {
  if (fileId == null) return null
  const row = await prisma.assetFile.findUnique({ where: { id: fileId } })
  if (!row) return '缩略图不存在'
  if (!row.mime.startsWith('image/')) return '缩略图必须是图片'
  return null
}
