import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestContext, type TestContext } from './helpers.js'
import { ensureDatabaseSchema } from '../src/ensureDatabaseSchema.js'

let ctx: TestContext

beforeAll(async () => {
  ctx = await createTestContext()
})

afterAll(async () => {
  await ctx.cleanup()
})

describe('3D 数据表', () => {
  it('创建全部表', async () => {
    const rows = await ctx.prisma.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master WHERE type = 'table'
    `
    const names = new Set(rows.map((row) => row.name))
    for (const table of ['ModelCategory', 'AssetFile', 'SystemModel', 'ImportedModel', 'Scene']) {
      expect(names.has(table), `缺少表 ${table}`).toBe(true)
    }
  })

  it('重复执行不报错且无新增步骤', async () => {
    const applied = await ensureDatabaseSchema(ctx.prisma)
    expect(applied).toEqual([])
  })

  it('创建关键索引与外键', async () => {
    const indexes = await ctx.prisma.$queryRaw<Array<{ name: string }>>`
      PRAGMA index_list('AssetFile')
    `
    expect(indexes.map((row) => row.name)).toContain('AssetFile_sha256_key')

    const modelIndexes = await ctx.prisma.$queryRaw<Array<{ name: string }>>`
      PRAGMA index_list('SystemModel')
    `
    expect(modelIndexes.map((row) => row.name)).toContain('SystemModel_key_key')

    const foreignKeys = await ctx.prisma.$queryRaw<Array<{ table: string }>>`
      PRAGMA foreign_key_list('Scene')
    `
    expect(foreignKeys.length).toBeGreaterThan(0)
  })
})
