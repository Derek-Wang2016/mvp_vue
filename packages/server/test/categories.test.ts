import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestContext, type TestContext } from './helpers.js'

let ctx: TestContext

beforeEach(async () => {
  ctx = await createTestContext()
})

afterEach(async () => {
  await ctx.cleanup()
})

describe('分类接口', () => {
  it('创建、排序、更新与重名冲突', async () => {
    const first = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/categories',
      payload: { name: '设备', sortOrder: 2 },
    })
    expect(first.statusCode).toBe(201)
    expect(first.json().name).toBe('设备')

    await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/categories',
      payload: { name: '房间', sortOrder: 1 },
    })

    const list = await ctx.app.inject({ url: '/api/3d/categories' })
    expect(list.json().map((row: { name: string }) => row.name)).toEqual(['房间', '设备'])

    const duplicate = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/categories',
      payload: { name: '设备' },
    })
    expect(duplicate.statusCode).toBe(409)
    expect(duplicate.json().field).toBe('name')

    const id = first.json().id
    const updated = await ctx.app.inject({
      method: 'PUT',
      url: `/api/3d/categories/${id}`,
      payload: { name: '医疗设备', sortOrder: 3 },
    })
    expect(updated.statusCode).toBe(200)
    expect(updated.json().name).toBe('医疗设备')
  })

  it('被模型引用时拒绝删除', async () => {
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/categories',
      payload: { name: '房间' },
    })
    const categoryId = created.json().id
    await ctx.prisma.systemModel.create({
      data: {
        key: 'room-x',
        name: 'X',
        kind: 'room',
        width: 4,
        depth: 5,
        height: 2.8,
        categoryId,
        configJson: JSON.stringify({ render: 'shell', defaultKind: 'room' }),
      },
    })

    const deleted = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/3d/categories/${categoryId}`,
    })
    expect(deleted.statusCode).toBe(409)
  })

  it('未被引用时可删除', async () => {
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/categories',
      payload: { name: '临时' },
    })
    const id = created.json().id
    const deleted = await ctx.app.inject({ method: 'DELETE', url: `/api/3d/categories/${id}` })
    expect(deleted.statusCode).toBe(200)
    const list = await ctx.app.inject({ url: '/api/3d/categories' })
    expect(list.json()).toHaveLength(0)
  })
})
