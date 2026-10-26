import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { categoryInputSchema, zodError } from './validation.js'
import { formatCategory } from './mappers.js'
import { isPrismaError, parseId, sendError } from './http.js'

export function registerCategoryRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get('/api/3d/categories', async (_req, reply) => {
    const rows = await prisma.modelCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    })
    reply.send(rows.map(formatCategory))
  })

  app.post('/api/3d/categories', async (req, reply) => {
    const parsed = categoryInputSchema.safeParse(req.body)
    if (!parsed.success) {
      const error = zodError(parsed.error)
      sendError(reply, 400, error.message, error.field)
      return
    }
    try {
      const row = await prisma.modelCategory.create({
        data: {
          name: parsed.data.name,
          sortOrder: parsed.data.sortOrder ?? 0,
        },
      })
      reply.status(201).send(formatCategory(row))
    } catch (err) {
      if (isPrismaError(err, 'P2002')) {
        sendError(reply, 409, '分类名称已存在', 'name')
        return
      }
      throw err
    }
  })

  app.put('/api/3d/categories/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, '无效的 id')
      return
    }
    const parsed = categoryInputSchema.partial().safeParse(req.body)
    if (!parsed.success) {
      const error = zodError(parsed.error)
      sendError(reply, 400, error.message, error.field)
      return
    }
    if (parsed.data.name === undefined && parsed.data.sortOrder === undefined) {
      sendError(reply, 400, '至少提供 name 或 sortOrder 之一')
      return
    }
    try {
      const row = await prisma.modelCategory.update({
        where: { id },
        data: {
          ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
          ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
        },
      })
      reply.send(formatCategory(row))
    } catch (err) {
      if (isPrismaError(err, 'P2025')) {
        sendError(reply, 404, '分类不存在')
        return
      }
      if (isPrismaError(err, 'P2002')) {
        sendError(reply, 409, '分类名称已存在', 'name')
        return
      }
      throw err
    }
  })

  app.delete('/api/3d/categories/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, '无效的 id')
      return
    }
    const [systemCount, importedCount] = await Promise.all([
      prisma.systemModel.count({ where: { categoryId: id } }),
      prisma.importedModel.count({ where: { categoryId: id } }),
    ])
    if (systemCount + importedCount > 0) {
      sendError(reply, 409, '分类仍被模型引用，无法删除')
      return
    }
    try {
      await prisma.modelCategory.delete({ where: { id } })
      reply.send({ ok: true })
    } catch (err) {
      if (isPrismaError(err, 'P2025')) {
        sendError(reply, 404, '分类不存在')
        return
      }
      // 计数与删除之间存在并发插入窗口，最终以数据库外键约束为准
      if (isPrismaError(err, 'P2003')) {
        sendError(reply, 409, '分类仍被模型引用，无法删除')
        return
      }
      throw err
    }
  })
}
