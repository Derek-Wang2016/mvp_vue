import { createHash } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import type { MultipartFile } from '@fastify/multipart'
import type { PrismaClient } from '@prisma/client'
import { fileUrl } from './mappers.js'
import { isPrismaError, parseId, sendError } from './http.js'

function detectMime(bytes: Buffer): string | null {
  if (bytes.length >= 4 && bytes.toString('ascii', 0, 4) === 'glTF') {
    return 'model/gltf-binary'
  }
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

function fileMeta(
  row: { id: number; name: string; mime: string; size: number; sha256: string },
  deduplicated: boolean,
) {
  const { id, name, mime, size, sha256 } = row
  return { id, name, mime, size, sha256, url: fileUrl(id), deduplicated }
}

export function registerFileRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.post('/api/3d/files', async (req, reply) => {
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

    let bytes: Buffer
    try {
      bytes = await part.toBuffer()
    } catch {
      sendError(reply, 413, '文件超过 50MB 限制', 'file')
      return
    }
    if (part.file.truncated) {
      sendError(reply, 413, '文件超过 50MB 限制', 'file')
      return
    }

    const mime = detectMime(bytes)
    if (!mime) {
      sendError(reply, 400, '仅支持 GLB、PNG、JPEG、WEBP 文件', 'file')
      return
    }

    const sha256 = createHash('sha256').update(bytes).digest('hex')
    const existing = await prisma.assetFile.findUnique({ where: { sha256 } })
    if (existing) {
      reply.send(fileMeta(existing, true))
      return
    }

    const name = (part.filename || 'file').slice(0, 200)
    try {
      const row = await prisma.assetFile.create({
        data: { name, mime, size: bytes.length, sha256, data: bytes },
      })
      reply.status(201).send(fileMeta(row, false))
    } catch (err) {
      if (isPrismaError(err, 'P2002')) {
        const raced = await prisma.assetFile.findUnique({ where: { sha256 } })
        if (raced) {
          reply.send(fileMeta(raced, true))
          return
        }
      }
      throw err
    }
  })

  app.get('/api/3d/files/:id/meta', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, '无效的 id')
      return
    }
    const row = await prisma.assetFile.findUnique({
      where: { id },
      select: { id: true, name: true, mime: true, size: true, sha256: true, createdAt: true },
    })
    if (!row) {
      sendError(reply, 404, '文件不存在')
      return
    }
    reply.send(row)
  })

  app.get('/api/3d/files/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, '无效的 id')
      return
    }
    const row = await prisma.assetFile.findUnique({
      where: { id },
      select: { name: true, mime: true, sha256: true, data: true },
    })
    if (!row) {
      sendError(reply, 404, '文件不存在')
      return
    }
    const query = req.query as { download?: string }
    const body = Buffer.from(row.data)
    reply
      .header('Content-Type', row.mime)
      .header('Content-Length', String(body.length))
      .header('ETag', `"${row.sha256}"`)
      .header('Cache-Control', 'public, max-age=31536000, immutable')
    if (query.download === '1') {
      reply.header(
        'Content-Disposition',
        `attachment; filename*=UTF-8''${encodeURIComponent(row.name)}`,
      )
    }
    reply.send(body)
  })

  app.delete('/api/3d/files/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, '无效的 id')
      return
    }
    const row = await prisma.assetFile.findUnique({ where: { id }, select: { id: true } })
    if (!row) {
      sendError(reply, 404, '文件不存在')
      return
    }
    const [systemCount, importedCount, sceneCount] = await Promise.all([
      prisma.systemModel.count({ where: { OR: [{ fileId: id }, { thumbnailFileId: id }] } }),
      prisma.importedModel.count({ where: { OR: [{ fileId: id }, { thumbnailFileId: id }] } }),
      prisma.scene.count({ where: { thumbnailFileId: id } }),
    ])
    if (systemCount + importedCount + sceneCount > 0) {
      const refs = [
        systemCount > 0 ? `系统模型 ${systemCount} 个` : null,
        importedCount > 0 ? `导入模型 ${importedCount} 个` : null,
        sceneCount > 0 ? `场景 ${sceneCount} 个` : null,
      ].filter(Boolean)
      sendError(reply, 409, `文件正被引用（${refs.join('、')}），无法删除`)
      return
    }
    try {
      await prisma.assetFile.delete({ where: { id } })
      reply.send({ ok: true })
    } catch (err) {
      if (isPrismaError(err, 'P2025')) {
        sendError(reply, 404, '文件不存在')
        return
      }
      // 计数与删除之间存在并发插入窗口，最终以数据库外键约束为准
      if (isPrismaError(err, 'P2003')) {
        sendError(reply, 409, '文件正被引用，无法删除')
        return
      }
      throw err
    }
  })
}
