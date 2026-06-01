import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import {
  allocatePublishId,
  assertPublishWritable,
  isStrictPagePolicy,
  parsePageId,
} from '../pageScopePolicy.js'
import { deepCloneSchemaJson, formatPublishDetail, sendScopeError } from '../routeUtils.js'

type PromoteBody = {
  name?: string
  publishId?: number
  mode?: 'create' | 'upsert'
}

export function registerPublishPageRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get('/api/publish/pages', async (_req, reply) => {
    const pages = await prisma.pagePublished.findMany({
      select: { id: true, name: true, createdAt: true, publishedAt: true },
      orderBy: { createdAt: 'desc' },
    })
    reply.send(pages)
  })

  app.post('/api/publish/pages/from-draft/:draftId', async (req, reply) => {
    try {
      assertPublishWritable()
      const { draftId } = req.params as { draftId: string }
      const draftPageId = parsePageId(draftId)
      const body = (req.body ?? {}) as PromoteBody

      const draft = await prisma.pageDraft.findUnique({ where: { id: draftPageId } })
      if (!draft) {
        reply.status(404).send({ error: '草稿不存在' })
        return
      }

      const name = body.name ?? draft.name
      const schemaJson = deepCloneSchemaJson(draft.schemaJson)
      const now = new Date()

      const shouldUpsert =
        body.publishId !== undefined ||
        body.mode === 'upsert'

      if (shouldUpsert) {
        const publishId =
          body.publishId ??
          (isStrictPagePolicy()
            ? await allocatePublishId(prisma, 100)
            : await allocatePublishId(prisma, 1))

        const page = await prisma.pagePublished.upsert({
          where: { id: publishId },
          create: {
            id: publishId,
            name,
            schemaJson,
            sourceDraftId: draftPageId,
            publishedAt: now,
          },
          update: {
            name,
            schemaJson,
            sourceDraftId: draftPageId,
            publishedAt: now,
          },
        })
        reply.status(body.publishId !== undefined ? 200 : 201).send(formatPublishDetail(page))
        return
      }

      const createData = {
        name,
        schemaJson,
        sourceDraftId: draftPageId,
        publishedAt: now,
      }

      const page = isStrictPagePolicy()
        ? await prisma.pagePublished.create({
            data: {
              id: await allocatePublishId(prisma, 100),
              ...createData,
            },
          })
        : await prisma.pagePublished.create({ data: createData })

      reply.status(201).send(formatPublishDetail(page))
    } catch (err) {
      if (sendScopeError(reply, err)) return
      throw err
    }
  })

  app.post('/api/publish/pages', async (req, reply) => {
    try {
      assertPublishWritable()
      const { name, schemaJson } = req.body as { name: string; schemaJson: unknown }
      const data = {
        name,
        schemaJson: JSON.stringify(schemaJson),
      }

      const page = isStrictPagePolicy()
        ? await prisma.pagePublished.create({
            data: {
              id: await allocatePublishId(prisma, 100),
              ...data,
            },
          })
        : await prisma.pagePublished.create({ data })

      reply.status(201).send(formatPublishDetail(page))
    } catch (err) {
      if (sendScopeError(reply, err)) return
      throw err
    }
  })

  app.get('/api/publish/pages/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string }
      const pageId = parsePageId(id)
      const page = await prisma.pagePublished.findUnique({ where: { id: pageId } })
      if (!page) {
        reply.status(404).send({ error: 'Page not found' })
        return
      }
      reply.send(formatPublishDetail(page))
    } catch (err) {
      if (sendScopeError(reply, err)) return
      throw err
    }
  })

  app.put('/api/publish/pages/:id', async (req, reply) => {
    try {
      assertPublishWritable()
      const { id } = req.params as { id: string }
      const pageId = parsePageId(id)
      const { name, schemaJson } = req.body as { name: string; schemaJson: unknown }
      const page = await prisma.pagePublished.update({
        where: { id: pageId },
        data: { name, schemaJson: JSON.stringify(schemaJson) },
      })
      reply.send(formatPublishDetail(page))
    } catch (err) {
      if (sendScopeError(reply, err)) return
      throw err
    }
  })

  app.patch('/api/publish/pages/:id', async (req, reply) => {
    try {
      assertPublishWritable()
      const { id } = req.params as { id: string }
      const pageId = parsePageId(id)
      const { name } = req.body as { name: string }
      const page = await prisma.pagePublished.update({
        where: { id: pageId },
        data: { name },
      })
      reply.send(page)
    } catch (err) {
      if (sendScopeError(reply, err)) return
      throw err
    }
  })

  app.delete('/api/publish/pages/:id', async (req, reply) => {
    try {
      assertPublishWritable()
      const { id } = req.params as { id: string }
      const pageId = parsePageId(id)
      await prisma.pagePublished.delete({ where: { id: pageId } })
      reply.send({ success: true })
    } catch (err) {
      if (sendScopeError(reply, err)) return
      throw err
    }
  })
}
