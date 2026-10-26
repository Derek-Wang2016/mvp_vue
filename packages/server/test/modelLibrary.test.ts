import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestContext, uploadGlb, type TestContext } from './helpers.js'

let ctx: TestContext

beforeEach(async () => {
  ctx = await createTestContext()
})

afterEach(async () => {
  await ctx.cleanup()
})

describe('运行时模型库接口', () => {
  it('输出房间、设备与导入模型，且无跳过项时不设置跳过响应头', async () => {
    const room = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/system-models',
      payload: {
        key: 'room-ward',
        name: '病房',
        kind: 'room',
        width: 4.2,
        depth: 5,
        height: 2.8,
        config: { render: 'shell', defaultKind: 'room' },
      },
    })
    expect(room.statusCode).toBe(201)

    const uploaded = await uploadGlb(ctx, 'bed.glb', 'library-bed')
    const fileId = uploaded.json().id

    const device = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/system-models',
      payload: {
        key: 'device-bed',
        name: '病床',
        kind: 'device',
        fileId,
        config: { deviceKind: 'bed', tagPrefix: 'BED', initialStatus: 'standby' },
      },
    })
    expect(device.statusCode).toBe(201)

    const imported = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/imported-models',
      payload: {
        name: '呼吸机',
        fileId,
        width: 0.8,
        depth: 0.6,
        config: { scale: 1 },
      },
    })
    expect(imported.statusCode).toBe(201)

    const res = await ctx.app.inject({ url: '/api/3d/model-library' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.system).toHaveLength(2)
    expect(body.imported).toHaveLength(1)

    const roomEntry = body.system.find((entry: { id: string }) => entry.id === 'room-ward')
    expect(roomEntry.category).toBe('room')
    expect(roomEntry.label).toBe('病房')
    expect(roomEntry.render).toBe('shell')
    expect(roomEntry.footprint).toEqual([4.2, 5])

    const bedEntry = body.system.find((entry: { id: string }) => entry.id === 'device-bed')
    expect(bedEntry.category).toBe('device')
    expect(bedEntry.url).toBe(`/api/3d/files/${fileId}`)
    expect(bedEntry.kind).toBe('bed')

    expect(body.imported[0].source).toBe('imported')
    expect(body.imported[0].id).toMatch(/^imported-\d+$/)
    expect(body.imported[0].label).toBe('呼吸机')
    expect(body.imported[0].url).toBe(`/api/3d/files/${fileId}`)
    expect(body.imported[0].footprint).toEqual([0.8, 0.6])
    expect(body.imported[0].config.scale).toBe(1)

    expect(res.headers['x-skipped-models']).toBeUndefined()
  })

  it('无文件的设备模型被跳过并写入响应头', async () => {
    await ctx.prisma.systemModel.create({
      data: {
        key: 'device-no-file',
        name: '无文件设备',
        kind: 'device',
        configJson: JSON.stringify({ deviceKind: 'bed', tagPrefix: 'BED' }),
      },
    })

    const res = await ctx.app.inject({ url: '/api/3d/model-library' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.system).toEqual([])
    expect(body.imported).toEqual([])
    expect(res.headers['x-skipped-models']).toBe('device-no-file')
  })

  it('脏导入模型被跳过，正常导入行仍输出', async () => {
    const uploaded = await uploadGlb(ctx, 'ventilator.glb', 'library-dirty')
    const fileId = uploaded.json().id
    const good = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/imported-models',
      payload: { name: '呼吸机', fileId, config: { scale: 1 } },
    })
    expect(good.statusCode).toBe(201)

    const dirty = await ctx.prisma.importedModel.create({
      data: { name: '坏配置模型', fileId, configJson: '{bad' },
    })

    const res = await ctx.app.inject({ url: '/api/3d/model-library' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.imported).toHaveLength(1)
    expect(body.imported[0].id).toBe(`imported-${good.json().id}`)
    expect(res.headers['x-skipped-models']).toBe(`imported-${dirty.id}`)
  })
})
