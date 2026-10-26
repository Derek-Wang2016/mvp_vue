import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'

const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'])

function parseId(raw: string): number | null {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

function parseDataUrl(dataUrl: string): { mime: string; bytes: Buffer } | { error: string } {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl.trim())
  if (!match) return { error: '需要 data URL（data:image/...;base64,...）' }
  const mime = match[1].toLowerCase()
  if (!ALLOWED.has(mime)) return { error: '仅支持 png、jpeg、gif、webp、svg' }
  const bytes = Buffer.from(match[2].replace(/\s/g, ''), 'base64')
  if (bytes.length === 0) return { error: '图片内容为空' }
  if (bytes.length > MAX_BYTES) return { error: '图片不能超过 2MB' }
  return { mime, bytes }
}

export function registerHostedImageRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get('/api/images', async (_req, reply) => {
    const rows = await prisma.$queryRaw<Array<{ id: number; name: string; mime: string; createdAt: Date }>>`
      SELECT id, name, mime, createdAt FROM HostedImage ORDER BY id DESC
    `
    reply.send(rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      mime: row.mime,
      url: `/api/images/${row.id}`,
      createdAt: row.createdAt,
    })))
  })

  app.get('/api/images/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      reply.status(400).send({ error: 'invalid id' })
      return
    }
    const rows = await prisma.$queryRaw<Array<{ mime: string; data: Buffer }>>`
      SELECT mime, data FROM HostedImage WHERE id = ${id}
    `
    const row = rows[0]
    if (!row) {
      reply.status(404).send({ error: '图片不存在' })
      return
    }
    reply
      .header('Content-Type', row.mime)
      .header('Cache-Control', 'public, max-age=86400')
      .send(Buffer.from(row.data))
  })

  app.post('/api/images', async (req, reply) => {
    const body = req.body as { name?: unknown; dataUrl?: unknown }
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const dataUrl = typeof body?.dataUrl === 'string' ? body.dataUrl : ''
    if (!name || name.length > 80) {
      reply.status(400).send({ error: '名称需为 1–80 个字符' })
      return
    }
    const parsed = parseDataUrl(dataUrl)
    if ('error' in parsed) {
      reply.status(400).send({ error: parsed.error })
      return
    }
    await prisma.$executeRaw`
      INSERT INTO HostedImage (name, mime, data, createdAt, updatedAt)
      VALUES (${name}, ${parsed.mime}, ${parsed.bytes}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `
    const ids = await prisma.$queryRaw<Array<{ id: number }>>`SELECT last_insert_rowid() AS id`
    const id = Number(ids[0]?.id)
    reply.status(201).send({ id, name, mime: parsed.mime, url: `/api/images/${id}` })
  })

  app.delete('/api/images/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      reply.status(400).send({ error: 'invalid id' })
      return
    }
    const existing = await prisma.$queryRaw<Array<{ id: number }>>`SELECT id FROM HostedImage WHERE id = ${id}`
    if (!existing[0]) {
      reply.status(404).send({ error: '图片不存在' })
      return
    }
    await prisma.$executeRaw`DELETE FROM HostedImage WHERE id = ${id}`
    reply.send({ ok: true })
  })
}
