import type { FastifyInstance } from 'fastify'
import type { Prisma, PrismaClient } from '@prisma/client'
import { importedModelInputSchema, zodError } from './validation.js'
import { formatImportedModel } from './mappers.js'
import { isPrismaError, parseId, sendError } from './http.js'
import { categoryRefError, modelFileError, thumbnailRefError } from './refs.js'

async function validateRefs(
  prisma: PrismaClient,
  input: { categoryId?: number | null; fileId: number; thumbnailFileId?: number | null },
) {
  const categoryError = await categoryRefError(prisma, input.categoryId)
  if (categoryError) return { error: categoryError, field: 'categoryId' }
  const fileError = await modelFileError(prisma, input.fileId)
  if (fileError) return { error: fileError, field: 'fileId' }
  const thumbnailError = await thumbnailRefError(prisma, input.thumbnailFileId)
  if (thumbnailError) return { error: thumbnailError, field: 'thumbnailFileId' }
  return null
}

export function registerImportedModelRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get('/api/3d/imported-models', async (req, reply) => {
    const query = req.query as Record<string, unknown>
    const where: Prisma.ImportedModelWhereInput = {}

    if (query.categoryId !== undefined && query.categoryId !== '') {
      const categoryId =
        typeof query.categoryId === 'string' ? parseId(query.categoryId) : null
      if (categoryId == null) {
        sendError(reply, 400, '无效的 categoryId', 'categoryId')
        return
      }
      where.categoryId = categoryId
    }
    if (query.q !== undefined && query.q !== '') {
      if (typeof query.q !== 'string') {
        sendError(reply, 400, 'q 必须是单个字符串', 'q')
        return
      }
      where.name = { contains: query.q }
    }

    const rows = await prisma.importedModel.findMany({
      where,
      include: { category: true },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    })
    reply.send(rows.map(formatImportedModel))
  })

  app.get('/api/3d/imported-models/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, '无效的 id')
      return
    }
    const row = await prisma.importedModel.findUnique({
      where: { id },
      include: { category: true },
    })
    if (!row) {
      sendError(reply, 404, '导入模型不存在')
      return
    }
    reply.send(formatImportedModel(row))
  })

  app.post('/api/3d/imported-models', async (req, reply) => {
    const parsed = importedModelInputSchema.safeParse(req.body)
    if (!parsed.success) {
      const error = zodError(parsed.error)
      sendError(reply, 400, error.message, error.field)
      return
    }
    const refError = await validateRefs(prisma, parsed.data)
    if (refError) {
      sendError(reply, 400, refError.error, refError.field)
      return
    }
    try {
      const row = await prisma.importedModel.create({
        data: {
          name: parsed.data.name,
          categoryId: parsed.data.categoryId ?? null,
          fileId: parsed.data.fileId,
          thumbnailFileId: parsed.data.thumbnailFileId ?? null,
          width: parsed.data.width ?? null,
          depth: parsed.data.depth ?? null,
          height: parsed.data.height ?? null,
          configJson: JSON.stringify(parsed.data.config),
        },
        include: { category: true },
      })
      reply.status(201).send(formatImportedModel(row))
    } catch (err) {
      if (isPrismaError(err, 'P2003')) {
        sendError(reply, 409, '引用的分类或文件不存在')
        return
      }
      throw err
    }
  })

  app.put('/api/3d/imported-models/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, '无效的 id')
      return
    }
    const parsed = importedModelInputSchema.safeParse(req.body)
    if (!parsed.success) {
      const error = zodError(parsed.error)
      sendError(reply, 400, error.message, error.field)
      return
    }
    const refError = await validateRefs(prisma, parsed.data)
    if (refError) {
      sendError(reply, 400, refError.error, refError.field)
      return
    }
    try {
      const row = await prisma.importedModel.update({
        where: { id },
        data: {
          name: parsed.data.name,
          categoryId: parsed.data.categoryId ?? null,
          fileId: parsed.data.fileId,
          thumbnailFileId: parsed.data.thumbnailFileId ?? null,
          width: parsed.data.width ?? null,
          depth: parsed.data.depth ?? null,
          height: parsed.data.height ?? null,
          configJson: JSON.stringify(parsed.data.config),
        },
        include: { category: true },
      })
      reply.send(formatImportedModel(row))
    } catch (err) {
      if (isPrismaError(err, 'P2025')) {
        sendError(reply, 404, '导入模型不存在')
        return
      }
      if (isPrismaError(err, 'P2003')) {
        sendError(reply, 409, '引用的分类或文件不存在')
        return
      }
      throw err
    }
  })

  app.delete('/api/3d/imported-models/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, '无效的 id')
      return
    }
    try {
      await prisma.importedModel.delete({ where: { id } })
      reply.send({ ok: true })
    } catch (err) {
      if (isPrismaError(err, 'P2025')) {
        sendError(reply, 404, '导入模型不存在')
        return
      }
      throw err
    }
  })
}
