import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { HMI_BUILTIN_SAMPLE_NAME, hmiDefaultSampleJson } from '@mvp-vue/schema'

type SourceRow = {
  id: number
  name: string
  mode: string
  method: string
  url: string
  body: string
  paramsJson: string
  sampleJson: string
  active: number | boolean
  builtin: number | boolean
  updatedAt: string
}

/**
 * 内置样例。建表时写入一行 builtin=1 的只读记录，前端不能改也不能删。
 * 想改内容就在界面上「另存为」，另存出来的记录才归用户所有。
 * 内容来自 `@mvp-vue/schema`，与编辑器默认文档同源。
 */
const BUILTIN_SAMPLE = {
  name: HMI_BUILTIN_SAMPLE_NAME,
  sampleJson: hmiDefaultSampleJson(),
} as const

function parseId(id: string): number {
  const value = Number(id)
  if (!Number.isInteger(value) || value <= 0) throw new Error('invalid id')
  return value
}

function asParams(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {}
  const parsed = JSON.parse(raw) as unknown
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('参数必须是 JSON 对象')
  return parsed as Record<string, unknown>
}

function fillTemplate(text: string, params: Record<string, unknown>): string {
  return text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key: string) => {
    const value = params[key]
    if (value == null) return ''
    return typeof value === 'string' ? value : JSON.stringify(value)
  })
}

function present(row: SourceRow) {
  return {
    id: row.id,
    name: row.name,
    mode: row.mode === 'http' ? 'http' : 'json',
    method: row.method === 'POST' ? 'POST' : 'GET',
    url: row.url,
    body: row.body,
    paramsJson: row.paramsJson,
    sampleJson: row.sampleJson,
    active: row.active === true || row.active === 1,
    builtin: row.builtin === true || row.builtin === 1,
    updatedAt: row.updatedAt,
  }
}

async function runHttp(row: Pick<SourceRow, 'method' | 'url' | 'body' | 'paramsJson'>): Promise<{ request: { method: string; url: string; body?: string }; status: number; data: unknown }> {
  const params = asParams(row.paramsJson)
  const url = fillTemplate(row.url, params).trim()
  if (!/^https?:\/\//i.test(url)) throw new Error('请求地址必须以 http:// 或 https:// 开头')
  const method = row.method === 'POST' ? 'POST' : 'GET'
  const headers: Record<string, string> = {}
  let body: string | undefined
  if (method === 'POST' && row.body.trim()) {
    body = fillTemplate(row.body, params)
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(url, { method, headers, body, signal: AbortSignal.timeout(8000) })
  const text = await res.text()
  let data: unknown = text
  try {
    data = JSON.parse(text) as unknown
  } catch {
    if (!res.ok) throw new Error(`请求失败 ${res.status}`)
    throw new Error('响应不是 JSON')
  }
  if (!res.ok) throw new Error(`请求失败 ${res.status}`)
  return { request: { method, url, body }, status: res.status, data }
}

const SELECT_COLUMNS = `"id", "name", "mode", "method", "url", "body", "paramsJson", "sampleJson", "active", "builtin", "updatedAt"`

async function findOne(prisma: PrismaClient, id: number): Promise<SourceRow | undefined> {
  const rows = await prisma.$queryRawUnsafe<SourceRow[]>(
    `SELECT ${SELECT_COLUMNS} FROM "HmiSampleSource" WHERE "id" = ?`,
    id,
  )
  return rows[0]
}

let tableReady: Promise<void> | null = null

/** 老库补 builtin 列。列已在时 SQLite 会报错，忽略即可。 */
async function addBuiltinColumn(prisma: PrismaClient) {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "HmiSampleSource" ADD COLUMN "builtin" INTEGER NOT NULL DEFAULT 0`,
    )
  } catch {
    // 列已存在
  }
}

/**
 * 建表 + 写入内置样例。内置样例只在这里插入一次：
 * 判据是 builtin = 1 且名称匹配，用户删不掉它（DELETE 有服务端拦截）。
 */
function ensureTable(prisma: PrismaClient) {
  tableReady ??= (async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "HmiSampleSource" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "mode" TEXT NOT NULL DEFAULT 'json',
        "method" TEXT NOT NULL DEFAULT 'GET',
        "url" TEXT NOT NULL DEFAULT '',
        "body" TEXT NOT NULL DEFAULT '',
        "paramsJson" TEXT NOT NULL DEFAULT '{}',
        "sampleJson" TEXT NOT NULL DEFAULT '{}',
        "active" INTEGER NOT NULL DEFAULT 0,
        "builtin" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await addBuiltinColumn(prisma)
    const existing = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
      `SELECT "id" FROM "HmiSampleSource" WHERE "builtin" = 1 LIMIT 1`,
    )
    if (existing.length > 0) return
    await prisma.$executeRawUnsafe(
      `INSERT INTO "HmiSampleSource" ("name", "mode", "method", "url", "body", "paramsJson", "sampleJson", "active", "builtin", "updatedAt") VALUES (?, 'json', 'GET', '', '', '{}', ?, 0, 1, CURRENT_TIMESTAMP)`,
      BUILTIN_SAMPLE.name,
      BUILTIN_SAMPLE.sampleJson,
    )
  })()
  return tableReady
}

export function registerHmiSampleSourceRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.addHook('onRequest', async (req) => {
    if (req.url.startsWith('/api/hmi/sample-sources')) await ensureTable(prisma)
  })

  app.get('/api/hmi/sample-sources', async (_req, reply) => {
    const rows = await prisma.$queryRawUnsafe<SourceRow[]>(
      `SELECT ${SELECT_COLUMNS} FROM "HmiSampleSource" ORDER BY "builtin" DESC, "updatedAt" DESC`,
    )
    reply.send(rows.map(present))
  })

  app.post('/api/hmi/sample-sources', async (req, reply) => {
    const body = req.body as Partial<SourceRow> & { name?: string }
    const name = body.name?.trim()
    if (!name) {
      reply.status(400).send({ error: '请填写名称' })
      return
    }
    await prisma.$executeRawUnsafe(
      `INSERT INTO "HmiSampleSource" ("name", "mode", "method", "url", "body", "paramsJson", "sampleJson", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      name,
      body.mode === 'http' ? 'http' : 'json',
      body.method === 'POST' ? 'POST' : 'GET',
      body.url ?? '',
      body.body ?? '',
      body.paramsJson ?? '{}',
      body.sampleJson ?? '{}',
    )
    const rows = await prisma.$queryRawUnsafe<SourceRow[]>(
      `SELECT ${SELECT_COLUMNS} FROM "HmiSampleSource" ORDER BY "id" DESC LIMIT 1`,
    )
    reply.status(201).send(present(rows[0]!))
  })

  app.put('/api/hmi/sample-sources/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    let sourceId: number
    try {
      sourceId = parseId(id)
    } catch {
      reply.status(400).send({ error: 'invalid id' })
      return
    }
    const body = req.body as Partial<SourceRow> & { name?: string }
    const name = body.name?.trim()
    if (!name) {
      reply.status(400).send({ error: '请填写名称' })
      return
    }
    // 内置样例只读：要改内容请另存为一条新样例
    const existing = await findOne(prisma, sourceId)
    if (!existing) {
      reply.status(404).send({ error: '样例不存在' })
      return
    }
    if (existing.builtin === true || existing.builtin === 1) {
      reply.status(403).send({ error: '内置样例不可修改，请另存为一条新样例' })
      return
    }
    try {
      asParams(body.paramsJson ?? '{}')
    } catch (err) {
      reply.status(400).send({ error: err instanceof Error ? err.message : '参数无效' })
      return
    }
    await prisma.$executeRawUnsafe(
      `UPDATE "HmiSampleSource" SET "name" = ?, "mode" = ?, "method" = ?, "url" = ?, "body" = ?, "paramsJson" = ?, "sampleJson" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`,
      name,
      body.mode === 'http' ? 'http' : 'json',
      body.method === 'POST' ? 'POST' : 'GET',
      body.url ?? '',
      body.body ?? '',
      body.paramsJson ?? '{}',
      body.sampleJson ?? '{}',
      sourceId,
    )
    const row = await findOne(prisma, sourceId)
    if (!row) {
      reply.status(404).send({ error: '样例不存在' })
      return
    }
    reply.send(present(row))
  })

  app.post('/api/hmi/sample-sources/test', async (req, reply) => {
    const body = req.body as Partial<SourceRow>
    try {
      const result = await runHttp({
        method: body.method === 'POST' ? 'POST' : 'GET',
        url: body.url ?? '',
        body: body.body ?? '',
        paramsJson: body.paramsJson ?? '{}',
      })
      reply.send(result)
    } catch (err) {
      reply.status(400).send({ error: err instanceof Error ? err.message : '测试失败' })
    }
  })

  app.post('/api/hmi/sample-sources/:id/activate', async (req, reply) => {
    const { id } = req.params as { id: string }
    let sourceId: number
    try {
      sourceId = parseId(id)
    } catch {
      reply.status(400).send({ error: 'invalid id' })
      return
    }
    const row = await findOne(prisma, sourceId)
    if (!row) {
      reply.status(404).send({ error: '样例不存在' })
      return
    }
    let data: unknown
    try {
      if (row.mode === 'http') data = (await runHttp(row)).data
      else data = JSON.parse(row.sampleJson || '{}') as unknown
    } catch (err) {
      reply.status(400).send({ error: err instanceof Error ? err.message : '激活失败' })
      return
    }
    await prisma.$executeRawUnsafe(`UPDATE "HmiSampleSource" SET "active" = 0`)
    await prisma.$executeRawUnsafe(
      `UPDATE "HmiSampleSource" SET "active" = 1, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`,
      sourceId,
    )
    reply.send({ id: sourceId, data })
  })

  app.delete('/api/hmi/sample-sources/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    let sourceId: number
    try {
      sourceId = parseId(id)
    } catch {
      reply.status(400).send({ error: 'invalid id' })
      return
    }
    const row = await findOne(prisma, sourceId)
    if (!row) {
      reply.status(404).send({ error: '样例不存在' })
      return
    }
    if (row.builtin === true || row.builtin === 1) {
      reply.status(403).send({ error: '内置样例不可删除' })
      return
    }
    await prisma.$executeRawUnsafe(`DELETE FROM "HmiSampleSource" WHERE "id" = ?`, sourceId)
    reply.send({ ok: true })
  })
}
