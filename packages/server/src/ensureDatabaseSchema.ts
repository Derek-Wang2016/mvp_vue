import type { PrismaClient } from '@prisma/client'

/**
 * 启动时补齐表结构。每步只执行一次，记录在 SchemaMigration。
 * 后续升级在 STEPS 末尾追加，id 不要改已上线的步骤。
 * SQL 尽量写成可重复执行（CREATE TABLE IF NOT EXISTS、ADD COLUMN 前先判断）。
 */
const HOSTED_IMAGE_SQL = `CREATE TABLE IF NOT EXISTS "HostedImage" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "mime" TEXT NOT NULL,
  "data" BLOB NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`

const MODEL_CATEGORY_SQL = `CREATE TABLE IF NOT EXISTS "ModelCategory" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`

const ASSET_FILE_SQL = `CREATE TABLE IF NOT EXISTS "AssetFile" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "mime" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "data" BLOB NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`

const SYSTEM_MODEL_SQL = `CREATE TABLE IF NOT EXISTS "SystemModel" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "categoryId" INTEGER,
  "kind" TEXT NOT NULL,
  "width" REAL,
  "depth" REAL,
  "height" REAL,
  "fileId" INTEGER,
  "thumbnailFileId" INTEGER,
  "configJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemModel_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ModelCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SystemModel_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "AssetFile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SystemModel_thumbnailFileId_fkey" FOREIGN KEY ("thumbnailFileId") REFERENCES "AssetFile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`

const IMPORTED_MODEL_SQL = `CREATE TABLE IF NOT EXISTS "ImportedModel" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "categoryId" INTEGER,
  "fileId" INTEGER NOT NULL,
  "thumbnailFileId" INTEGER,
  "width" REAL,
  "depth" REAL,
  "height" REAL,
  "configJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportedModel_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ModelCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ImportedModel_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "AssetFile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ImportedModel_thumbnailFileId_fkey" FOREIGN KEY ("thumbnailFileId") REFERENCES "AssetFile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`

const DEVICE_MODEL_SQL = `CREATE TABLE IF NOT EXISTS "DeviceModel" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "categoryId" INTEGER,
  "fileId" INTEGER NOT NULL,
  "thumbnailFileId" INTEGER,
  "width" REAL,
  "depth" REAL,
  "height" REAL,
  "configJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeviceModel_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ModelCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DeviceModel_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "AssetFile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DeviceModel_thumbnailFileId_fkey" FOREIGN KEY ("thumbnailFileId") REFERENCES "AssetFile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`

const SCENE_SQL = `CREATE TABLE IF NOT EXISTS "Scene" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sceneJson" TEXT NOT NULL,
  "thumbnailFileId" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Scene_thumbnailFileId_fkey" FOREIGN KEY ("thumbnailFileId") REFERENCES "AssetFile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`

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
    id: '2026-10-22-hosted-image',
    sql: HOSTED_IMAGE_SQL,
  },
  {
    id: '2026-10-20-editable-text',
    sql: `CREATE TABLE IF NOT EXISTS "EditableText" (
      "key" TEXT NOT NULL PRIMARY KEY,
      "content" TEXT NOT NULL DEFAULT '',
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    id: '2026-10-26-3d-model-category',
    sql: MODEL_CATEGORY_SQL,
  },
  {
    id: '2026-10-26-3d-model-category-name-index',
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS "ModelCategory_name_key" ON "ModelCategory"("name")`,
  },
  {
    id: '2026-10-26-3d-asset-file',
    sql: ASSET_FILE_SQL,
  },
  {
    id: '2026-10-26-3d-asset-file-sha-index',
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS "AssetFile_sha256_key" ON "AssetFile"("sha256")`,
  },
  {
    id: '2026-10-26-3d-system-model',
    sql: SYSTEM_MODEL_SQL,
  },
  {
    id: '2026-10-26-3d-system-model-key-index',
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS "SystemModel_key_key" ON "SystemModel"("key")`,
  },
  {
    id: '2026-10-26-3d-system-model-category-index',
    sql: `CREATE INDEX IF NOT EXISTS "SystemModel_categoryId_kind_idx" ON "SystemModel"("categoryId", "kind")`,
  },
  {
    id: '2026-10-26-3d-imported-model',
    sql: IMPORTED_MODEL_SQL,
  },
  {
    id: '2026-10-26-3d-imported-model-category-index',
    sql: `CREATE INDEX IF NOT EXISTS "ImportedModel_categoryId_idx" ON "ImportedModel"("categoryId")`,
  },
  {
    id: '2026-11-04-3d-device-model',
    sql: DEVICE_MODEL_SQL,
  },
  {
    id: '2026-11-04-3d-device-model-category-index',
    sql: `CREATE INDEX IF NOT EXISTS "DeviceModel_categoryId_idx" ON "DeviceModel"("categoryId")`,
  },
  {
    id: '2026-11-04-3d-migrate-system-devices',
    sql: `INSERT INTO "DeviceModel" (
      "name", "categoryId", "fileId", "thumbnailFileId", "width", "depth", "height", "configJson"
    )
    SELECT
      "name", "categoryId", "fileId", "thumbnailFileId", "width", "depth", "height", "configJson"
    FROM "SystemModel"
    WHERE "kind" = 'device' AND "fileId" IS NOT NULL`,
  },
  {
    id: '2026-10-26-3d-scene',
    sql: SCENE_SQL,
  },
  {
    id: '2026-11-11-hmi-file',
    sql: `CREATE TABLE IF NOT EXISTS "HmiFile" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "mime" TEXT NOT NULL,
      "size" INTEGER NOT NULL,
      "sha256" TEXT NOT NULL,
      "data" BLOB NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    id: '2026-11-11-hmi-file-sha',
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS "HmiFile_sha256_key" ON "HmiFile"("sha256")`,
  },
  {
    id: '2026-11-10-hmi-screen',
    sql: `CREATE TABLE IF NOT EXISTS "HmiScreen" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "schemaJson" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

  // 升级旧库时，迁移记录可能来自别的文件；表不存在就补建，不依赖是否记过步骤
  const hosted = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'HostedImage'`,
  )
  if (hosted.length === 0) {
    await prisma.$executeRawUnsafe(HOSTED_IMAGE_SQL)
    if (!ran.includes('2026-10-22-hosted-image')) ran.push('2026-10-22-hosted-image')
  }

  return ran
}
