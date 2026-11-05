import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestContext, uploadGlb, type TestContext } from './helpers.js'

let ctx: TestContext

beforeEach(async () => {
  ctx = await createTestContext()
})

afterEach(async () => {
  await ctx.cleanup()
})

describe('设备模型接口', () => {
  it('从导入模型复制并固化，保留源模型和完整配置', async () => {
    const file = await uploadGlb(ctx, 'monitor.glb', 'device-model-source')
    const imported = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/imported-models',
      payload: {
        name: '监护仪',
        fileId: file.json().id,
        width: 0.8,
        depth: 0.6,
        height: 1.4,
        config: {
          scale: 1.2,
          dataConnected: true,
          labels: [{ name: 'patient.name', label: '病人姓名' }],
        },
      },
    })
    expect(imported.statusCode).toBe(201)

    const promoted = await ctx.app.inject({
      method: 'POST',
      url: `/api/3d/imported-models/${imported.json().id}/device-models`,
    })
    expect(promoted.statusCode).toBe(201)
    expect(promoted.json()).toMatchObject({
      name: '监护仪',
      fileId: file.json().id,
      width: 0.8,
      depth: 0.6,
      config: {
        scale: 1.2,
        labels: [{ name: 'patient.name', label: '病人姓名' }],
      },
    })

    const source = await ctx.app.inject({
      url: `/api/3d/imported-models/${imported.json().id}`,
    })
    expect(source.statusCode).toBe(200)

    const list = await ctx.app.inject({ url: '/api/3d/device-models' })
    expect(list.statusCode).toBe(200)
    expect(list.json()).toHaveLength(1)
  })
})
