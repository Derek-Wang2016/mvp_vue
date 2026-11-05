import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import {
  deviceModelToLibraryEntry,
  importedModelToLibraryEntry,
  systemModelToLibraryEntry,
} from './mappers.js'

export function registerModelLibraryRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get('/api/3d/model-library', async (_req, reply) => {
    const [systemRows, deviceRows, importedRows] = await Promise.all([
      prisma.systemModel.findMany({
        where: { kind: 'room' },
        select: {
          id: true,
          key: true,
          name: true,
          kind: true,
          width: true,
          depth: true,
          height: true,
          fileId: true,
          configJson: true,
        },
        orderBy: [{ kind: 'asc' }, { id: 'asc' }],
      }),
      prisma.deviceModel.findMany({
        select: {
          id: true,
          name: true,
          fileId: true,
          width: true,
          depth: true,
          configJson: true,
        },
        orderBy: { id: 'asc' },
      }),
      prisma.importedModel.findMany({
        select: {
          id: true,
          name: true,
          fileId: true,
          width: true,
          depth: true,
          configJson: true,
        },
        orderBy: { id: 'asc' },
      }),
    ])

    const system: Array<Record<string, unknown>> = []
    const devices: Array<Record<string, unknown>> = []
    const imported: Array<Record<string, unknown>> = []
    const skipped: string[] = []

    for (const row of systemRows) {
      const mapped = systemModelToLibraryEntry(row)
      if (mapped.entry) system.push(mapped.entry)
      else if (mapped.skipped) skipped.push(row.key)
    }

    for (const row of deviceRows) {
      const mapped = deviceModelToLibraryEntry(row)
      if (mapped.entry) devices.push(mapped.entry)
      else if (mapped.skipped) skipped.push(`device-${row.id}`)
    }

    for (const row of importedRows) {
      const mapped = importedModelToLibraryEntry(row)
      if (mapped.entry) imported.push(mapped.entry)
      else if (mapped.skipped) skipped.push(`imported-${row.id}`)
    }

    const skippedHeader = skipped
      .map((token) => encodeURIComponent(token).slice(0, 200))
      .join(',')
      .slice(0, 4000)
    if (skippedHeader) {
      reply.header('X-Skipped-Models', skippedHeader)
    }
    reply.send({ system, devices, imported })
  })
}
