import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import {
  importedModelToLibraryEntry,
  systemModelToLibraryEntry,
} from './mappers.js'

export function registerModelLibraryRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get('/api/3d/model-library', async (_req, reply) => {
    const [systemRows, importedRows] = await Promise.all([
      prisma.systemModel.findMany({ orderBy: [{ kind: 'asc' }, { id: 'asc' }] }),
      prisma.importedModel.findMany({ orderBy: { id: 'asc' } }),
    ])

    const system: Array<Record<string, unknown>> = []
    const imported: Array<Record<string, unknown>> = []
    const skipped: string[] = []

    for (const row of systemRows) {
      const mapped = systemModelToLibraryEntry(row)
      if (mapped.entry) system.push(mapped.entry)
      else if (mapped.skipped) skipped.push(row.key)
    }

    for (const row of importedRows) {
      const mapped = importedModelToLibraryEntry(row)
      if (mapped.entry) imported.push(mapped.entry)
      else if (mapped.skipped) skipped.push(`imported-${row.id}`)
    }

    if (skipped.length > 0) {
      reply.header('X-Skipped-Models', skipped.join(','))
    }
    reply.send({ system, imported })
  })
}
