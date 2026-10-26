import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createTestContext,
  uploadGlb,
  type TestContext,
} from './helpers.js'

let ctx: TestContext

beforeEach(async () => {
  ctx = await createTestContext()
})

afterEach(async () => {
  await ctx.cleanup()
})

async function createRoom() {
  return ctx.app.inject({
    method: 'POST',
    url: '/api/3d/system-models',
    payload: {
      key: 'room-ward',
      name: '病房',
      kind: 'room',
      width: 4.2,
      depth: 5,
      height: 2.8,
      config: { render: 'shell', defaultKind: 'room', bedLayout: { count: 4 } },
    },
  })
}

describe('系统模型接口', () => {
  it('创建房间与设备模板，列表不含 config、详情包含', async () => {
    const room = await createRoom()
    expect(room.statusCode).toBe(201)
    expect(room.json().config.bedLayout.count).toBe(4)

    const uploaded = await uploadGlb(ctx, 'bed.glb', 'system-bed')
    const device = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/system-models',
      payload: {
        key: 'device-bed',
        name: '病床',
        kind: 'device',
        fileId: uploaded.json().id,
        width: 2.1,
        depth: 1.063,
        config: {
          deviceKind: 'bed',
          tagPrefix: 'BED',
          initialStatus: 'standby',
          footprint: [2.1, 1.063],
        },
      },
    })
    expect(device.statusCode).toBe(201)
    expect(device.json().fileUrl).toBe(`/api/3d/files/${uploaded.json().id}`)

    const list = await ctx.app.inject({ url: '/api/3d/system-models' })
    const rows = list.json()
    expect(rows).toHaveLength(2)
    expect(rows[0].config).toBeUndefined()

    const detail = await ctx.app.inject({ url: '/api/3d/system-models/device-bed' })
    expect(detail.statusCode).toBe(200)
    expect(detail.json().config.deviceKind).toBe('bed')
  })

  it('校验 key 唯一、房间尺寸、设备文件与非法配置', async () => {
    await createRoom()

    const duplicate = await createRoom()
    expect(duplicate.statusCode).toBe(409)

    const noWidth = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/system-models',
      payload: {
        key: 'room-no-width',
        name: 'X',
        kind: 'room',
        depth: 5,
        height: 2.8,
        config: {},
      },
    })
    expect(noWidth.statusCode).toBe(400)

    const badConfig = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/system-models',
      payload: {
        key: 'device-bad',
        name: 'X',
        kind: 'device',
        fileId: 999,
        config: { deviceKind: 'bed', tagPrefix: 'BED' },
      },
    })
    expect(badConfig.statusCode).toBe(400)
    expect(badConfig.json().field).toBe('fileId')
  })

  it('render=glb 的房间必须有 fileId', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/system-models',
      payload: {
        key: 'room-glb',
        name: 'GLB 房间',
        kind: 'room',
        width: 4,
        depth: 4,
        height: 2.8,
        config: { render: 'glb' },
      },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().field).toBe('fileId')
  })

  it('更新与删除', async () => {
    const created = await createRoom()
    const id = created.json().id
    const updated = await ctx.app.inject({
      method: 'PUT',
      url: `/api/3d/system-models/${id}`,
      payload: {
        key: 'room-ward',
        name: '病房（改）',
        kind: 'room',
        width: 3,
        depth: 7,
        height: 2.8,
        config: { render: 'shell', defaultKind: 'room', bedLayout: { count: 6 } },
      },
    })
    expect(updated.statusCode).toBe(200)
    expect(updated.json().name).toBe('病房（改）')
    expect(updated.json().config.bedLayout.count).toBe(6)

    const deleted = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/3d/system-models/${id}`,
    })
    expect(deleted.statusCode).toBe(200)
    const missing = await ctx.app.inject({ url: `/api/3d/system-models/${id}` })
    expect(missing.statusCode).toBe(404)
  })

  it('按分类、类型与关键字过滤', async () => {
    const category = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/categories',
      payload: { name: '房间' },
    })
    const categoryId = category.json().id
    await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/system-models',
      payload: {
        key: 'room-a',
        name: '病房A',
        kind: 'room',
        width: 4,
        depth: 5,
        height: 2.8,
        categoryId,
        config: {},
      },
    })
    const uploaded = await uploadGlb(ctx, 'monitor.glb', 'filter-monitor')
    await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/system-models',
      payload: {
        key: 'device-mon',
        name: '监护仪',
        kind: 'device',
        fileId: uploaded.json().id,
        categoryId,
        config: { deviceKind: 'monitor', tagPrefix: 'MON' },
      },
    })

    const byCategory = await ctx.app.inject({
      url: `/api/3d/system-models?categoryId=${categoryId}`,
    })
    expect(byCategory.json()).toHaveLength(2)

    const byKind = await ctx.app.inject({ url: '/api/3d/system-models?kind=device' })
    expect(byKind.json().map((row: { key: string }) => row.key)).toEqual(['device-mon'])

    const byQuery = await ctx.app.inject({
      url: `/api/3d/system-models?q=${encodeURIComponent('病房')}`,
    })
    expect(byQuery.json().map((row: { key: string }) => row.key)).toEqual(['room-a'])

    const repeated = await ctx.app.inject({ url: '/api/3d/system-models?q=a&q=b' })
    expect(repeated.statusCode).toBe(400)
  })

  it('可按数字 id 读取详情', async () => {
    const created = await createRoom()
    const detail = await ctx.app.inject({
      url: `/api/3d/system-models/${created.json().id}`,
    })
    expect(detail.statusCode).toBe(200)
    expect(detail.json().key).toBe('room-ward')
  })

  it('拒绝过深的 config 且不泄露异常', async () => {
    const uploaded = await uploadGlb(ctx, 'deep.glb', 'deep-config')
    const fileId = uploaded.json().id
    await ctx.prisma.systemModel.create({
      data: {
        key: 'device-ok',
        name: '正常设备',
        kind: 'device',
        fileId,
        configJson: JSON.stringify({ deviceKind: 'bed', tagPrefix: 'BED' }),
      },
    })

    const deep = '{"a":'.repeat(20000) + '1' + '}'.repeat(20000)
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/system-models',
      payload: `{"key":"device-deep","name":"深","kind":"device","fileId":${fileId},"config":{"deviceKind":"bed","tagPrefix":"BED","deep":${deep}}}`,
      headers: { 'content-type': 'application/json' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().field).toBe('config')
    expect(res.body).not.toContain('Maximum call stack')

    const valid = await ctx.app.inject({ url: '/api/3d/system-models/device-ok' })
    expect(valid.statusCode).toBe(200)
    expect(valid.json().config.deviceKind).toBe('bed')
  })

  it('configJson 损坏时返回固定错误', async () => {
    await ctx.prisma.systemModel.create({
      data: {
        key: 'device-corrupt',
        name: '损坏设备',
        kind: 'device',
        configJson: '{bad',
      },
    })
    const res = await ctx.app.inject({ url: '/api/3d/system-models/device-corrupt' })
    expect(res.statusCode).toBe(500)
    expect(res.json()).toEqual({ error: '模型配置已损坏' })
    expect(res.body).not.toContain('Unexpected token')
  })
})
