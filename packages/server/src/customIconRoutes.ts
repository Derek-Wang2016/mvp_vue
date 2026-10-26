import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import {
  createCustomIcon,
  deleteCustomIcon,
  getCustomIconById,
  listCustomIcons,
  updateCustomIcon,
  validateCustomIconInput,
} from './customIcons.js'

export function registerCustomIconRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get('/api/custom-icons', async (req, reply) => {
    const query = req.query as { includeSvg?: string }
    const includeSvg = query.includeSvg === '1' || query.includeSvg === 'true'
    const items = await listCustomIcons(prisma, { includeSvg })
    reply.send(items)
  })

  app.get('/api/custom-icons/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const iconId = Number(id)
    if (!Number.isInteger(iconId) || iconId <= 0) {
      reply.status(400).send({ error: 'invalid id' })
      return
    }
    const icon = await getCustomIconById(prisma, iconId)
    if (!icon) {
      reply.status(404).send({ error: 'Custom icon not found' })
      return
    }
    reply.send(icon)
  })

  app.post('/api/custom-icons', async (req, reply) => {
    const body = req.body as { name?: unknown; svgContent?: unknown }
    const validation = validateCustomIconInput(body)
    if (validation) {
      reply.status(400).send({ error: validation.message, field: validation.field })
      return
    }
    const icon = await createCustomIcon(prisma, {
      name: String(body.name).trim(),
      svgContent: String(body.svgContent).trim(),
    })
    reply.status(201).send(icon)
  })

  app.put('/api/custom-icons/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const iconId = Number(id)
    if (!Number.isInteger(iconId) || iconId <= 0) {
      reply.status(400).send({ error: 'invalid id' })
      return
    }
    const body = req.body as { name?: unknown; svgContent?: unknown }
    if (body.name === undefined && body.svgContent === undefined) {
      reply.status(400).send({ error: '至少提供 name 或 svgContent 之一' })
      return
    }
    const validation = validateCustomIconInput(body)
    if (validation) {
      reply.status(400).send({ error: validation.message, field: validation.field })
      return
    }
    const icon = await updateCustomIcon(prisma, iconId, {
      ...(body.name !== undefined ? { name: String(body.name) } : {}),
      ...(body.svgContent !== undefined ? { svgContent: String(body.svgContent) } : {}),
    })
    if (!icon) {
      reply.status(404).send({ error: 'Custom icon not found' })
      return
    }
    reply.send(icon)
  })

  app.delete('/api/custom-icons/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const iconId = Number(id)
    if (!Number.isInteger(iconId) || iconId <= 0) {
      reply.status(400).send({ error: 'invalid id' })
      return
    }
    const deleted = await deleteCustomIcon(prisma, iconId)
    if (!deleted) {
      reply.status(404).send({ error: 'Custom icon not found' })
      return
    }
    reply.send({ success: true })
  })
}
