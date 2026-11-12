import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'

interface PublicationRow {
  id: number
  description: string
  screenId: number | null
  status: string
  schemaJson: string
  updatedAt: string
}

function parseId(id: string): number {
  const value = Number(id)
  if (!Number.isInteger(value) || value <= 0) throw new Error('invalid id')
  return value
}

export function registerHmiPublicationRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get('/api/hmi/publications', async (_req, reply) => {
    const rows = await prisma.$queryRawUnsafe<PublicationRow[]>(
      `SELECT "id", "description", "screenId", "status", "updatedAt" FROM "HmiPublication" ORDER BY "updatedAt" DESC`,
    )
    reply.send(rows)
  })

  app.post('/api/hmi/publications', async (req, reply) => {
    const body = req.body as { description?: string; schemaJson?: unknown; screenId?: number | null }
    const description = body.description?.trim() ?? ''
    if (!description || body.schemaJson == null) {
      reply.status(400).send({ error: 'description and schemaJson required' })
      return
    }
    await prisma.$executeRawUnsafe(
      `INSERT INTO "HmiPublication" ("description", "schemaJson", "screenId", "status") VALUES (?, ?, ?, 'active')`,
      description,
      JSON.stringify(body.schemaJson),
      body.screenId ?? null,
    )
    const rows = await prisma.$queryRawUnsafe<PublicationRow[]>(
      `SELECT "id", "description", "screenId", "status", "updatedAt" FROM "HmiPublication" ORDER BY "id" DESC LIMIT 1`,
    )
    reply.status(201).send(rows[0])
  })

  app.get('/api/hmi/publications/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    let publicationId: number
    try {
      publicationId = parseId(id)
    } catch {
      reply.status(400).send({ error: 'invalid id' })
      return
    }
    const rows = await prisma.$queryRawUnsafe<PublicationRow[]>(
      `SELECT "id", "description", "screenId", "status", "schemaJson", "updatedAt" FROM "HmiPublication" WHERE "id" = ?`,
      publicationId,
    )
    const row = rows[0]
    if (!row) {
      reply.status(404).send({ error: 'not found' })
      return
    }
    if (row.status !== 'active') {
      reply.status(409).send({ error: 'paused' })
      return
    }
    reply.send(JSON.parse(row.schemaJson))
  })

  app.put('/api/hmi/publications/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = req.body as { description?: string; schemaJson?: unknown; status?: string }
    let publicationId: number
    try {
      publicationId = parseId(id)
    } catch {
      reply.status(400).send({ error: 'invalid id' })
      return
    }
    const current = await prisma.$queryRawUnsafe<PublicationRow[]>(
      `SELECT "id", "description", "schemaJson", "status" FROM "HmiPublication" WHERE "id" = ?`,
      publicationId,
    )
    if (!current[0]) {
      reply.status(404).send({ error: 'not found' })
      return
    }
    const nextSchema = body.schemaJson != null ? JSON.stringify(body.schemaJson) : null
    const unchanged = nextSchema != null && nextSchema === current[0].schemaJson
    const description = body.description != null ? body.description.trim() : current[0].description
    if (!description) {
      reply.status(400).send({ error: 'description required' })
      return
    }
    if (body.status != null && body.status !== 'active' && body.status !== 'paused') {
      reply.status(400).send({ error: 'invalid status' })
      return
    }
    if (!unchanged) {
      await prisma.$executeRawUnsafe(
        `UPDATE "HmiPublication" SET "description" = ?, "schemaJson" = ?, "status" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`,
        description,
        nextSchema ?? current[0].schemaJson,
        body.status ?? current[0].status,
        publicationId,
      )
    }
    const rows = await prisma.$queryRawUnsafe<PublicationRow[]>(
      `SELECT "id", "description", "screenId", "status", "updatedAt" FROM "HmiPublication" WHERE "id" = ?`,
      publicationId,
    )
    reply.send({ ...rows[0], unchanged })
  })

  app.delete('/api/hmi/publications/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    let publicationId: number
    try {
      publicationId = parseId(id)
    } catch {
      reply.status(400).send({ error: 'invalid id' })
      return
    }
    await prisma.$executeRawUnsafe(`DELETE FROM "HmiPublication" WHERE "id" = ?`, publicationId)
    reply.send({ success: true })
  })
}
