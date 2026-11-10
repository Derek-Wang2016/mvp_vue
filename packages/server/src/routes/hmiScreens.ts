import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'

function parseId(id: string): number {
  const pageId = Number(id)
  if (!Number.isInteger(pageId) || pageId <= 0) {
    throw new Error('invalid id')
  }
  return pageId
}

export function registerHmiScreenRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get('/api/hmi/screens', async (_req, reply) => {
    const screens = await prisma.hmiScreen.findMany({
      select: { id: true, name: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    })
    reply.send(screens)
  })

  app.post('/api/hmi/screens', async (req, reply) => {
    const { name, schemaJson } = req.body as { name?: string; schemaJson?: unknown }
    if (!name || schemaJson == null) {
      reply.status(400).send({ error: 'name and schemaJson required' })
      return
    }
    const screen = await prisma.hmiScreen.create({
      data: { name, schemaJson: JSON.stringify(schemaJson) },
    })
    reply.status(201).send({ ...screen, schemaJson })
  })

  app.get('/api/hmi/screens/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    let screenId: number
    try {
      screenId = parseId(id)
    } catch {
      reply.status(400).send({ error: 'invalid id' })
      return
    }
    const screen = await prisma.hmiScreen.findUnique({ where: { id: screenId } })
    if (!screen) {
      reply.status(404).send({ error: 'Screen not found' })
      return
    }
    reply.send({
      ...screen,
      schemaJson: JSON.parse(screen.schemaJson),
    })
  })

  app.put('/api/hmi/screens/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { name, schemaJson } = req.body as { name?: string; schemaJson?: unknown }
    let screenId: number
    try {
      screenId = parseId(id)
    } catch {
      reply.status(400).send({ error: 'invalid id' })
      return
    }
    if (!name || schemaJson == null) {
      reply.status(400).send({ error: 'name and schemaJson required' })
      return
    }
    const screen = await prisma.hmiScreen.update({
      where: { id: screenId },
      data: { name, schemaJson: JSON.stringify(schemaJson) },
    })
    reply.send({ ...screen, schemaJson })
  })

  app.delete('/api/hmi/screens/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    let screenId: number
    try {
      screenId = parseId(id)
    } catch {
      reply.status(400).send({ error: 'invalid id' })
      return
    }
    await prisma.hmiScreen.delete({ where: { id: screenId } })
    reply.send({ success: true })
  })
}
