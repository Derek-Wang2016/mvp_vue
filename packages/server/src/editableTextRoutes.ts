import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'

const KEY_MAX = 128
const CONTENT_MAX = 8000

function parseKey(raw: string): { ok: true; key: string } | { ok: false; error: string } {
  let key = raw
  try {
    key = decodeURIComponent(raw)
  } catch {
    key = raw
  }
  key = key.trim()
  if (!key) return { ok: false, error: 'KEY 不能为空' }
  if (key.length > KEY_MAX) return { ok: false, error: `KEY 最长 ${KEY_MAX} 个字符` }
  if (/[\r\n]/.test(key)) return { ok: false, error: 'KEY 不能包含换行' }
  return { ok: true, key }
}

export function registerEditableTextRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get('/api/editable-texts/:key', async (req, reply) => {
    const parsed = parseKey((req.params as { key: string }).key)
    if (!parsed.ok) {
      reply.status(400).send({ error: parsed.error })
      return
    }
    const rows = await prisma.$queryRaw<Array<{ key: string; content: string; updatedAt: Date }>>`
      SELECT key, content, updatedAt FROM EditableText WHERE key = ${parsed.key}
    `
    const row = rows[0]
    if (!row) {
      reply.status(404).send({ error: '数据行不存在' })
      return
    }
    reply.send({ key: row.key, content: row.content, updatedAt: row.updatedAt })
  })

  app.put('/api/editable-texts/:key', async (req, reply) => {
    const parsed = parseKey((req.params as { key: string }).key)
    if (!parsed.ok) {
      reply.status(400).send({ error: parsed.error })
      return
    }
    const body = req.body as { content?: unknown }
    if (typeof body?.content !== 'string') {
      reply.status(400).send({ error: 'content 必须是字符串' })
      return
    }
    if (body.content.length > CONTENT_MAX) {
      reply.status(400).send({ error: `内容最长 ${CONTENT_MAX} 个字符` })
      return
    }
    await prisma.$executeRaw`
      INSERT INTO EditableText (key, content, updatedAt)
      VALUES (${parsed.key}, ${body.content}, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        content = excluded.content,
        updatedAt = CURRENT_TIMESTAMP
    `
    const rows = await prisma.$queryRaw<Array<{ key: string; content: string; updatedAt: Date }>>`
      SELECT key, content, updatedAt FROM EditableText WHERE key = ${parsed.key}
    `
    reply.send(rows[0])
  })
}
