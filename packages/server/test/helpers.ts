import { randomUUID } from 'node:crypto'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app.js'
import { ensureDatabaseSchema } from '../src/ensureDatabaseSchema.js'

export interface TestContext {
  prisma: PrismaClient
  app: FastifyInstance
  cleanup: () => Promise<void>
}

const prismaDir = fileURLToPath(new URL('../prisma', import.meta.url))

function removeDbFiles(dbPath: string): void {
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    try {
      rmSync(dbPath + suffix, { force: true })
    } catch {
      // Windows 上句柄释放可能有延迟，测试文件已被 .gitignore 覆盖
    }
  }
}

export async function createTestContext(): Promise<TestContext> {
  const dbName = `test-${randomUUID()}.db`
  process.env.DATABASE_URL = `file:./${dbName}`
  const dbPath = join(prismaDir, dbName)
  const prisma = new PrismaClient()
  let app: FastifyInstance
  try {
    await ensureDatabaseSchema(prisma)
    app = await buildApp(prisma, { logger: false })
  } catch (err) {
    await prisma.$disconnect()
    removeDbFiles(dbPath)
    throw err
  }
  return {
    prisma,
    app,
    cleanup: async () => {
      await app.close()
      await prisma.$disconnect()
      removeDbFiles(dbPath)
    },
  }
}

export function multipartBody(filename: string, mime: string, bytes: Buffer) {
  const boundary = `----mvp3d${randomUUID()}`
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`,
  )
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`)
  return {
    payload: Buffer.concat([head, bytes, tail]),
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
  }
}

export function sampleGlb(tag: string): Buffer {
  const rawJson = Buffer.from(JSON.stringify({ asset: { version: '2.0' }, tag }))
  const padded = (4 - (rawJson.length % 4)) % 4
  const json = Buffer.concat([rawJson, Buffer.alloc(padded, 0x20)])
  const total = 12 + 8 + json.length
  const header = Buffer.alloc(12)
  header.write('glTF', 0, 'ascii')
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(total, 8)
  const chunk = Buffer.alloc(8)
  chunk.writeUInt32LE(json.length, 0)
  chunk.writeUInt32LE(0x4e4f534a, 4)
  return Buffer.concat([header, chunk, json])
}

export async function uploadGlb(ctx: TestContext, name: string, tag: string) {
  const body = multipartBody(name, 'model/gltf-binary', sampleGlb(tag))
  return ctx.app.inject({
    method: 'POST',
    url: '/api/3d/files',
    payload: body.payload,
    headers: body.headers,
  })
}
