import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { registerCategoryRoutes } from './categories.js'

export function registerThreeDRoutes(app: FastifyInstance, prisma: PrismaClient) {
  registerCategoryRoutes(app, prisma)
}
