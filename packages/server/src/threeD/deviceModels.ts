import type { FastifyInstance } from 'fastify'
import type { Prisma, PrismaClient } from '@prisma/client'
import {
  deviceModelInputSchema,
  zodError,
  type DeviceModelInput,
} from './validation.js'
import { formatDeviceModel } from './mappers.js'
import { isPrismaError, parseId, sendError } from './http.js'
import { categoryRefError, modelFileError, thumbnailRefError } from './refs.js'

function toRowData(input: DeviceModelInput) {
  return {
    name: input.name,
    categoryId: input.categoryId ?? null,
    fileId: input.fileId,
    thumbnailFileId: input.thumbnailFileId ?? null,
    width: input.width ?? null,
    depth: input.depth ?? null,
    height: input.height ?? null,
    configJson: JSON.stringify(input.config),
  }
}

async function validateRefs(prisma: PrismaClient, input: DeviceModelInput) {
  const categoryError = await categoryRefError(prisma, input.categoryId)
  if (categoryError) return { error: categoryError, field: 'categoryId' }
  const fileError = await modelFileError(prisma, input.fileId)
  if (fileError) return { error: fileError, field: 'fileId' }
  const thumbnailError = await thumbnailRefError(prisma, input.thumbnailFileId)
  if (thumbnailError) return { error: thumbnailError, field: 'thumbnailFileId' }
  return null
}

export function registerDeviceModelRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get('/api/3d/device-models', async (_req, reply) => {
    const rows = await prisma.deviceModel.findMany({
      include: { category: true },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    })
    reply.send(rows.map(formatDeviceModel))
  })

  app.get('/api/3d/device-models/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) return sendError(reply, 400, '无效的 id')
    const row = await prisma.deviceModel.findUnique({
      where: { id },
      include: { category: true },
    })
    if (!row) return sendError(reply, 404, '设备模型不存在')
    reply.send(formatDeviceModel(row))
  })

  app.post('/api/3d/device-models', async (req, reply) => {
    const parsed = deviceModelInputSchema.safeParse(req.body)
    if (!parsed.success) {
      const error = zodError(parsed.error)
      return sendError(reply, 400, error.message, error.field)
    }
    const refError = await validateRefs(prisma, parsed.data)
    if (refError) return sendError(reply, 400, refError.error, refError.field)
    try {
      const row = await prisma.deviceModel.create({
        data: toRowData(parsed.data),
        include: { category: true },
      })
      reply.status(201).send(formatDeviceModel(row))
    } catch (err) {
      if (isPrismaError(err, 'P2003')) return sendError(reply, 409, '引用的分类或文件不存在')
      throw err
    }
  })

  app.post('/api/3d/imported-models/:id/device-models', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) return sendError(reply, 400, '无效的 id')
    const imported = await prisma.importedModel.findUnique({ where: { id } })
    if (!imported) return sendError(reply, 404, '导入模型不存在')
    const row = await prisma.deviceModel.create({
      data: {
        name: imported.name,
        categoryId: imported.categoryId,
        fileId: imported.fileId,
        thumbnailFileId: imported.thumbnailFileId,
        width: imported.width,
        depth: imported.depth,
        height: imported.height,
        configJson: imported.configJson,
      },
      include: { category: true },
    })
    reply.status(201).send(formatDeviceModel(row))
  })

  app.put('/api/3d/device-models/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) return sendError(reply, 400, '无效的 id')
    const parsed = deviceModelInputSchema.safeParse(req.body)
    if (!parsed.success) {
      const error = zodError(parsed.error)
      return sendError(reply, 400, error.message, error.field)
    }
    const refError = await validateRefs(prisma, parsed.data)
    if (refError) return sendError(reply, 400, refError.error, refError.field)
    try {
      const row = await prisma.deviceModel.update({
        where: { id },
        data: toRowData(parsed.data),
        include: { category: true },
      })
      reply.send(formatDeviceModel(row))
    } catch (err) {
      if (isPrismaError(err, 'P2025')) return sendError(reply, 404, '设备模型不存在')
      if (isPrismaError(err, 'P2003')) return sendError(reply, 409, '引用的分类或文件不存在')
      throw err
    }
  })

  app.delete('/api/3d/device-models/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) return sendError(reply, 400, '无效的 id')
    try {
      await prisma.deviceModel.delete({ where: { id } })
      reply.send({ ok: true })
    } catch (err) {
      if (isPrismaError(err, 'P2025')) return sendError(reply, 404, '设备模型不存在')
      throw err
    }
  })
}
