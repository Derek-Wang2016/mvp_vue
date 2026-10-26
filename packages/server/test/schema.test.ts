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
})
