import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { registerCategoryRoutes } from './categories.js'
import { registerFileRoutes } from './files.js'
import { CorruptConfigError } from './http.js'
import { registerImportedModelRoutes } from './importedModels.js'
import { registerModelLibraryRoutes } from './modelLibrary.js'
import { registerSceneRoutes } from './scenes.js'
import { registerSystemModelRoutes } from './systemModels.js'

export function registerThreeDRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.register(async (scope) => {
    scope.setErrorHandler((err, req, reply) => {
      req.log.error(err)
      if (err instanceof CorruptConfigError) {
        reply.status(500).send({ error: '模型配置已损坏' })
        return
      }
      const statusCode = (err as { statusCode?: unknown }).statusCode
      if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
        reply.status(statusCode).send({ error: '请求不合法' })
        return
      }
      reply.status(500).send({ error: '服务器内部错误' })
    })

    registerCategoryRoutes(scope, prisma)
    registerFileRoutes(scope, prisma)
    registerImportedModelRoutes(scope, prisma)
    registerModelLibraryRoutes(scope, prisma)
    registerSceneRoutes(scope, prisma)
    registerSystemModelRoutes(scope, prisma)
  })
}
