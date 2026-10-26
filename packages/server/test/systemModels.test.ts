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
})
