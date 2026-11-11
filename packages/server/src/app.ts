import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import type { PrismaClient } from '@prisma/client'
import { registerDraftPageRoutes } from './routes/draftPages.js'
import { registerPublishPageRoutes } from './routes/publishPages.js'
import { registerEditableTextRoutes } from './editableTextRoutes.js'
import { registerHostedImageRoutes } from './hostedImageRoutes.js'
import { registerCustomIconRoutes } from './customIconRoutes.js'
import { registerDemoRoutes } from './demoRoutes.js'
import { registerThreeDRoutes } from './threeD/registerThreeDRoutes.js'
import { registerHmiScreenRoutes } from './routes/hmiScreens.js'
import { registerHmiFileRoutes } from './routes/hmiFiles.js'

export async function buildApp(
  prisma: PrismaClient,
  options: { logger?: boolean } = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? true,
    bodyLimit: 8 * 1024 * 1024,
  })

  await app.register(cors, {
    origin: true,
    exposedHeaders: ['X-Skipped-Models'],
  })
  await app.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024, files: 1, fields: 20 },
  })

  registerDraftPageRoutes(app, prisma)
  registerPublishPageRoutes(app, prisma)
  registerEditableTextRoutes(app, prisma)
  registerHostedImageRoutes(app, prisma)
  registerCustomIconRoutes(app, prisma)
  registerThreeDRoutes(app, prisma)
  registerHmiScreenRoutes(app, prisma)
  registerHmiFileRoutes(app, prisma)
  registerDemoRoutes(app, prisma)

  return app
}
