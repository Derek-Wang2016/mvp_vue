import type { PrismaClient } from '@prisma/client'

/**
 * 启动时补齐表结构。每步只执行一次，记录在 SchemaMigration。
 * 后续升级在 STEPS 末尾追加，id 不要改已上线的步骤。
 * SQL 尽量写成可重复执行（CREATE TABLE IF NOT EXISTS、ADD COLUMN 前先判断）。
 */
const STEPS: { id: string; sql: string }[] = [
  {
    id: '2026-10-21-baseline-page-draft',
    sql: `CREATE TABLE IF NOT EXISTS "PageDraft" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "schemaJson" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`,
  },
  {
    id: '2026-10-21-baseline-page-published',
    sql: `CREATE TABLE IF NOT EXISTS "PagePublished" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "schemaJson" TEXT NOT NULL,
      "sourceDraftId" INTEGER,
      "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    id: '2026-10-21-baseline-custom-icon',
    sql: `CREATE TABLE IF NOT EXISTS "CustomIcon" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "svgContent" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`,
  },
  {
    id: '2026-10-20-editable-text',
    sql: `CREATE TABLE IF NOT EXISTS "EditableText" (
      "key" TEXT NOT NULL PRIMARY KEY,
      "content" TEXT NOT NULL DEFAULT '',
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
]

export async function ensureDatabaseSchema(prisma: PrismaClient): Promise<string[]> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SchemaMigration" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const applied = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT "id" FROM "SchemaMigration"`,
  )
  const done = new Set(applied.map((row) => row.id))
  const ran: string[] = []

  for (const step of STEPS) {
    if (done.has(step.id)) continue
    await prisma.$executeRawUnsafe(step.sql)
    await prisma.$executeRaw`INSERT INTO "SchemaMigration" ("id") VALUES (${step.id})`
    ran.push(step.id)
  }

  return ran
}
