import type { FastifyInstance } from 'fastify'
import type { Prisma, PrismaClient } from '@prisma/client'
import {
  systemModelInputSchema,
  zodError,
  type SystemModelInput,
} from './validation.js'
import { formatSystemModel, formatSystemModelDetail } from './mappers.js'
import { isPrismaError, parseId, sendError } from './http.js'
import { categoryRefError, modelFileError, thumbnailRefError } from './refs.js'

function toRowData(input: SystemModelInput) {
  return {
    key: input.key,
    name: input.name,
    categoryId: input.categoryId ?? null,
    kind: input.kind,
    width: input.width ?? null,
    depth: input.depth ?? null,
    height: input.height ?? null,
    fileId: input.fileId ?? null,
    thumbnailFileId: input.thumbnailFileId ?? null,
    configJson: JSON.stringify(input.config),
  }
}

async function validateRefs(prisma: PrismaClient, input: SystemModelInput) {
  const categoryError = await categoryRefError(prisma, input.categoryId)
  if (categoryError) return { error: categoryError, field: 'categoryId' }
  const fileError = await modelFileError(prisma, input.fileId)
  if (fileError) return { error: fileError, field: 'fileId' }
  const thumbnailError = await thumbnailRefError(prisma, input.thumbnailFileId)
  if (thumbnailError) return { error: thumbnailError, field: 'thumbnailFileId' }
  if (input.kind === 'room' && input.config.render === 'glb' && input.fileId == null) {
    return { error: 'render=glb 的房间需要 fileId', field: 'fileId' }
  }
  return null
}

async function findModel(prisma: PrismaClient, raw: string) {
  const id = parseId(raw)
  const where: Prisma.SystemModelWhereUniqueInput =
    id != null ? { id } : { key: raw }
  return prisma.systemModel.findUnique({
    where,
    include: { category: true },
  })
}

export function registerSystemModelRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get('/api/3d/system-models', async (req, reply) => {
    const query = req.query as Record<string, unknown>
    const where: Prisma.SystemModelWhereInput = {}

    if (query.categoryId !== undefined && query.categoryId !== '') {
      const categoryId =
        typeof query.categoryId === 'string' ? parseId(query.categoryId) : null
      if (categoryId == null) {
        sendError(reply, 400, '无效的 categoryId', 'categoryId')
        return
      }
      where.categoryId = categoryId
    }
    if (query.kind !== undefined && query.kind !== '') {
      if (query.kind !== 'room' && query.kind !== 'device') {
        sendError(reply, 400, 'kind 只能是 room 或 device', 'kind')
        return
      }
      where.kind = query.kind
    }
    if (query.q !== undefined && query.q !== '') {
      if (typeof query.q !== 'string') {
        sendError(reply, 400, 'q 必须是单个字符串', 'q')
        return
      }
      where.OR = [{ key: { contains: query.q } }, { name: { contains: query.q } }]
    }

    const rows = await prisma.systemModel.findMany({
      where,
      include: { category: true },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    })
    reply.send(rows.map(formatSystemModel))
  })

  app.get('/api/3d/system-models/:idOrKey', async (req, reply) => {
    const raw = (req.params as { idOrKey: string }).idOrKey
    const row = await findModel(prisma, raw)
    if (!row) {
      sendError(reply, 404, '系统模型不存在')
      return
    }
    reply.send(formatSystemModelDetail(row))
  })

  app.post('/api/3d/system-models', async (req, reply) => {
    const parsed = systemModelInputSchema.safeParse(req.body)
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
      const row = await prisma.systemModel.create({
        data: toRowData(parsed.data),
        include: { category: true },
      })
      reply.status(201).send(formatSystemModelDetail(row))
    } catch (err) {
      if (isPrismaError(err, 'P2002')) {
        sendError(reply, 409, '模型 key 已存在', 'key')
        return
      }
      if (isPrismaError(err, 'P2003')) {
        sendError(reply, 409, '引用的分类或文件不存在')
        return
      }
      throw err
    }
  })

  app.put('/api/3d/system-models/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, '无效的 id')
      return
    }
    const parsed = systemModelInputSchema.safeParse(req.body)
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
      const row = await prisma.systemModel.update({
        where: { id },
        data: toRowData(parsed.data),
        include: { category: true },
      })
      reply.send(formatSystemModelDetail(row))
    } catch (err) {
      if (isPrismaError(err, 'P2025')) {
        sendError(reply, 404, '系统模型不存在')
        return
      }
      if (isPrismaError(err, 'P2002')) {
        sendError(reply, 409, '模型 key 已存在', 'key')
        return
      }
      if (isPrismaError(err, 'P2003')) {
        sendError(reply, 409, '引用的分类或文件不存在')
        return
      }
      throw err
    }
  })

  app.delete('/api/3d/system-models/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, '无效的 id')
      return
    }
    try {
      await prisma.systemModel.delete({ where: { id } })
      reply.send({ ok: true })
    } catch (err) {
      if (isPrismaError(err, 'P2025')) {
        sendError(reply, 404, '系统模型不存在')
        return
      }
      throw err
    }
  })
}
