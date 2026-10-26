import type { FastifyInstance } from 'fastify'
import type { PrismaClient, Scene } from '@prisma/client'
import { normalizeSceneJson, sceneMetaSchema, zodError } from './validation.js'
import { formatSceneMeta } from './mappers.js'
import { isPrismaError, parseId, sendError } from './http.js'
import { thumbnailRefError } from './refs.js'

function parseStoredScene(raw: string): unknown | undefined {
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

function sceneDetail(row: Scene, scene: unknown) {
  return { ...formatSceneMeta(row), scene }
}

export function registerSceneRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get('/api/3d/scenes', async (_req, reply) => {
    const rows = await prisma.scene.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        thumbnailFileId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    })
    reply.send(rows.map(formatSceneMeta))
  })

  app.get('/api/3d/scenes/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, '无效的 id')
      return
    }
    const row = await prisma.scene.findUnique({ where: { id } })
    if (!row) {
      sendError(reply, 404, '场景不存在')
      return
    }
    const scene = parseStoredScene(row.sceneJson)
    if (scene === undefined) {
      sendError(reply, 500, '场景 JSON 已损坏')
      return
    }
    reply.send(sceneDetail(row, scene))
  })

  app.post('/api/3d/scenes', async (req, reply) => {
    const body = req.body as { sceneJson?: unknown } | null
    const meta = sceneMetaSchema.safeParse(req.body)
    if (!meta.success) {
      const error = zodError(meta.error)
      sendError(reply, 400, error.message, error.field)
      return
    }
    const normalized = normalizeSceneJson(body?.sceneJson)
    if (!normalized.ok) {
      sendError(reply, 400, normalized.error, normalized.field)
      return
    }
    const thumbnailError = await thumbnailRefError(prisma, meta.data.thumbnailFileId)
    if (thumbnailError) {
      sendError(reply, 400, thumbnailError, 'thumbnailFileId')
      return
    }
    try {
      const row = await prisma.scene.create({
        data: {
          name: meta.data.name,
          description: meta.data.description ?? null,
          sceneJson: normalized.value,
          thumbnailFileId: meta.data.thumbnailFileId ?? null,
        },
      })
      reply.status(201).send(sceneDetail(row, JSON.parse(normalized.value)))
    } catch (err) {
      if (isPrismaError(err, 'P2003')) {
        sendError(reply, 409, '引用的缩略图不存在')
        return
      }
      throw err
    }
  })

  app.put('/api/3d/scenes/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, '无效的 id')
      return
    }
    const body = req.body as { sceneJson?: unknown } | null
    const meta = sceneMetaSchema.safeParse(req.body)
    if (!meta.success) {
      const error = zodError(meta.error)
      sendError(reply, 400, error.message, error.field)
      return
    }
    const normalized = normalizeSceneJson(body?.sceneJson)
    if (!normalized.ok) {
      sendError(reply, 400, normalized.error, normalized.field)
      return
    }
    const thumbnailError = await thumbnailRefError(prisma, meta.data.thumbnailFileId)
    if (thumbnailError) {
      sendError(reply, 400, thumbnailError, 'thumbnailFileId')
      return
    }
    try {
      const row = await prisma.scene.update({
        where: { id },
        data: {
          name: meta.data.name,
          description: meta.data.description ?? null,
          sceneJson: normalized.value,
          thumbnailFileId: meta.data.thumbnailFileId ?? null,
        },
      })
      reply.send(sceneDetail(row, JSON.parse(normalized.value)))
    } catch (err) {
      if (isPrismaError(err, 'P2025')) {
        sendError(reply, 404, '场景不存在')
        return
      }
      if (isPrismaError(err, 'P2003')) {
        sendError(reply, 409, '引用的缩略图不存在')
        return
      }
      throw err
    }
  })

  app.delete('/api/3d/scenes/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, '无效的 id')
      return
    }
    try {
      await prisma.scene.delete({ where: { id } })
      reply.send({ ok: true })
    } catch (err) {
      if (isPrismaError(err, 'P2025')) {
        sendError(reply, 404, '场景不存在')
        return
      }
      throw err
    }
  })
}
