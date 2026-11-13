import { createHash } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import type { MultipartFile } from '@fastify/multipart'
import type { PrismaClient } from '@prisma/client'
import { parseId, sendError } from '../threeD/http.js'

type FileRow = {
  id: number | bigint
  name: string
  mime: string
  size: number | bigint
  sha256: string
  createdAt?: Date
  data?: Buffer
}

function asFile(row: FileRow) {
  return {
    id: Number(row.id),
    name: row.name,
    mime: row.mime,
    size: Number(row.size),
    sha256: row.sha256,
  }
}

async function findBySha(prisma: PrismaClient, sha256: string) {
  const rows = await prisma.$queryRaw<FileRow[]>`
    SELECT "id", "name", "mime", "size", "sha256" FROM "HmiFile" WHERE "sha256" = ${sha256}
  `
  return rows[0] ? asFile(rows[0]) : null
}

function detectMime(bytes: Buffer): string | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes.toString('ascii', 1, 4) === 'PNG') {
    return 'image/png'
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
}

function fileBase(req: { protocol: string; headers: Record<string, string | string[] | undefined> }) {
  const forwarded = req.headers['x-forwarded-proto']
  const proto = (Array.isArray(forwarded) ? forwarded[0] : forwarded) || req.protocol
  const hostHeader = req.headers['x-forwarded-host'] ?? req.headers.host
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader
  return `${proto}://${host}`
}

function fileMeta(
  row: { id: number; name: string; mime: string; size: number; sha256: string },
  deduplicated: boolean,
  base: string,
) {
  return {
    id: row.id,
    name: row.name,
    mime: row.mime,
    size: row.size,
    sha256: row.sha256,
    url: `${base}/api/hmi/files/${row.id}`,
    deduplicated,
  }
}

export function registerHmiFileRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get('/api/hmi/files', async (req, reply) => {
    const base = fileBase(req)
    const rows = await prisma.$queryRaw<FileRow[]>`
      SELECT "id", "name", "mime", "size", "sha256", "createdAt"
      FROM "HmiFile" ORDER BY "id" DESC
    `
    reply.send(rows.map((row) => {
      const file = asFile(row)
      return { ...file, createdAt: row.createdAt, url: `${base}/api/hmi/files/${file.id}` }
    }))
  })

  app.post('/api/hmi/files', async (req, reply) => {
    const base = fileBase(req)
    let part: MultipartFile | undefined
    try {
      part = await req.file()
    } catch (err) {
      const code = (err as { code?: string }).code
      sendError(
        reply,
        code === 'FST_REQ_FILE_TOO_LARGE' ? 413 : 400,
        '文件上传失败（仅支持 multipart/form-data，单文件不超过 50MB）',
        'file',
      )
      return
    }
    if (!part) {
      sendError(reply, 400, '缺少 file 字段', 'file')
      return
    }
    if (part.fieldname !== 'file') {
      sendError(reply, 400, '必须以 file 字段上传文件', 'file')
      return
    }

    let bytes: Buffer
    try {
      bytes = await part.toBuffer()
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'FST_REQ_FILE_TOO_LARGE') {
        sendError(reply, 413, '文件超过 50MB 限制', 'file')
      } else {
        sendError(reply, 400, '文件上传失败', 'file')
      }
      return
    }
    if (part.file.truncated) {
      sendError(reply, 413, '文件超过 50MB 限制', 'file')
      return
    }

    const mime = detectMime(bytes)
    if (!mime) {
      sendError(reply, 400, '仅支持 PNG、JPEG、WEBP 文件', 'file')
      return
    }

    const sha256 = createHash('sha256').update(bytes).digest('hex')
    const existing = await findBySha(prisma, sha256)
    if (existing) {
      reply.send(fileMeta(existing, true, base))
      return
    }

    const name = Array.from(part.filename || 'file').slice(0, 200).join('')
    try {
      await prisma.$executeRaw`
        INSERT INTO "HmiFile" ("name", "mime", "size", "sha256", "data")
        VALUES (${name}, ${mime}, ${bytes.length}, ${sha256}, ${bytes})
      `
    } catch (err) {
      const raced = await findBySha(prisma, sha256)
      if (raced) {
        reply.send(fileMeta(raced, true, base))
        return
      }
      throw err
    }
    const created = await findBySha(prisma, sha256)
    reply.status(201).send(fileMeta(created!, false, base))
  })

  app.get('/api/hmi/files/:id/meta', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, '无效的 id')
      return
    }
    const rows = await prisma.$queryRaw<FileRow[]>`
      SELECT "id", "name", "mime", "size", "sha256", "createdAt"
      FROM "HmiFile" WHERE "id" = ${id}
    `
    const row = rows[0]
    if (!row) {
      sendError(reply, 404, '文件不存在')
      return
    }
    reply.send({ ...asFile(row), createdAt: row.createdAt })
  })

  app.get('/api/hmi/files/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, '无效的 id')
      return
    }
    const rows = await prisma.$queryRaw<FileRow[]>`
      SELECT "name", "mime", "sha256", "data" FROM "HmiFile" WHERE "id" = ${id}
    `
    const row = rows[0]
    if (!row?.data) {
      sendError(reply, 404, '文件不存在')
      return
    }
    const query = req.query as { download?: string }
    reply
      .header('Content-Type', row.mime)
      .header('Content-Length', String(row.data.byteLength))
      .header('ETag', `"${row.sha256}"`)
      .header('Cache-Control', 'public, max-age=31536000, immutable')
    if (query.download === '1') {
      reply.header(
        'Content-Disposition',
        `attachment; filename*=UTF-8''${encodeURIComponent(row.name)}`,
      )
    }
    reply.send(row.data)
  })

  app.delete('/api/hmi/files/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, '无效的 id')
      return
    }
    const rows = await prisma.$queryRaw<FileRow[]>`
      SELECT "id", "name", "mime", "size", "sha256" FROM "HmiFile" WHERE "id" = ${id}
    `
    if (!rows[0]) {
      sendError(reply, 404, '文件不存在')
      return
    }
    const screens = await prisma.hmiScreen.findMany({ select: { schemaJson: true } })
    const ref = new RegExp(`/api/hmi/files/${id}(?![0-9])`)
    const used = screens.filter((screen) => ref.test(screen.schemaJson)).length
    if (used > 0) {
      sendError(reply, 409, `文件正被 ${used} 个画面引用，无法删除`)
      return
    }
    const removed = await prisma.$executeRaw`DELETE FROM "HmiFile" WHERE "id" = ${id}`
    if (removed === 0) {
      sendError(reply, 404, '文件不存在')
      return
    }
    reply.send({ ok: true })
  })
}
