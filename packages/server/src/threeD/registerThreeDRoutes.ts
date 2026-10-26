import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { registerCategoryRoutes } from './categories.js'
import { registerFileRoutes } from './files.js'
import { registerSystemModelRoutes } from './systemModels.js'

export function registerThreeDRoutes(app: FastifyInstance, prisma: PrismaClient) {
  registerCategoryRoutes(app, prisma)
  registerFileRoutes(app, prisma)
  registerSystemModelRoutes(app, prisma)
}
