import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { assertDraftWritable, parsePageId } from '../pageScopePolicy.js'
import { formatDraftDetail, sendScopeError } from '../routeUtils.js'

export function registerDraftPageRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get('/api/draft/pages', async (_req, reply) => {
    const pages = await prisma.pageDraft.findMany({
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
    reply.send(pages)
  })

  app.post('/api/draft/pages', async (req, reply) => {
    try {
      assertDraftWritable()
      const { name, schemaJson } = req.body as { name: string; schemaJson: unknown }
      const page = await prisma.pageDraft.create({
        data: { name, schemaJson: JSON.stringify(schemaJson) },
      })
      reply.status(201).send(page)
    } catch (err) {
      if (sendScopeError(reply, err)) return
      throw err
    }
  })

  app.get('/api/draft/pages/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string }
      const pageId = parsePageId(id)
      const page = await prisma.pageDraft.findUnique({ where: { id: pageId } })
      if (!page) {
        reply.status(404).send({ error: 'Page not found' })
        return
      }
      reply.send(formatDraftDetail(page))
    } catch (err) {
      if (sendScopeError(reply, err)) return
      throw err
    }
  })

  app.put('/api/draft/pages/:id', async (req, reply) => {
    try {
      assertDraftWritable()
      const { id } = req.params as { id: string }
      const pageId = parsePageId(id)
      const { name, schemaJson } = req.body as { name: string; schemaJson: unknown }
      const page = await prisma.pageDraft.update({
        where: { id: pageId },
        data: { name, schemaJson: JSON.stringify(schemaJson) },
      })
      reply.send(page)
    } catch (err) {
      if (sendScopeError(reply, err)) return
      throw err
    }
  })

  app.patch('/api/draft/pages/:id', async (req, reply) => {
    try {
      assertDraftWritable()
      const { id } = req.params as { id: string }
      const pageId = parsePageId(id)
      const { name } = req.body as { name: string }
      const page = await prisma.pageDraft.update({
        where: { id: pageId },
        data: { name },
      })
      reply.send(page)
    } catch (err) {
      if (sendScopeError(reply, err)) return
      throw err
    }
  })

  app.delete('/api/draft/pages/:id', async (req, reply) => {
    try {
      assertDraftWritable()
      const { id } = req.params as { id: string }
      const pageId = parsePageId(id)
      await prisma.pageDraft.delete({ where: { id: pageId } })
      reply.send({ success: true })
    } catch (err) {
      if (sendScopeError(reply, err)) return
      throw err
    }
  })
}
