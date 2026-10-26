import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { registerCategoryRoutes } from './categories.js'
import { registerFileRoutes } from './files.js'
import { registerImportedModelRoutes } from './importedModels.js'
import { registerSceneRoutes } from './scenes.js'
import { registerSystemModelRoutes } from './systemModels.js'

export function registerThreeDRoutes(app: FastifyInstance, prisma: PrismaClient) {
  registerCategoryRoutes(app, prisma)
  registerFileRoutes(app, prisma)
  registerImportedModelRoutes(app, prisma)
  registerSceneRoutes(app, prisma)
  registerSystemModelRoutes(app, prisma)
}
