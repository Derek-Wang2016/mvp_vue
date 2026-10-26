import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createTestContext,
  multipartBody,
  uploadGlb,
  type TestContext,
} from './helpers.js'

const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])

async function uploadImage(ctx: TestContext, name: string) {
  const body = multipartBody(name, 'image/png', pngBytes)
  return ctx.app.inject({
    method: 'POST',
    url: '/api/3d/files',
    payload: body.payload,
    headers: body.headers,
  })
}

let ctx: TestContext

beforeEach(async () => {
  ctx = await createTestContext()
})

afterEach(async () => {
  await ctx.cleanup()
})

describe('导入模型接口', () => {
  it('创建、列表与删除导入模型', async () => {
    const uploaded = await uploadGlb(ctx, 'ventilator.glb', 'ventilator')
    const thumbnail = await uploadImage(ctx, 'ventilator.png')
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/imported-models',
      payload: {
        name: '呼吸机',
        fileId: uploaded.json().id,
        thumbnailFileId: thumbnail.json().id,
        width: 0.8,
        depth: 0.6,
        height: 1.4,
        config: { scale: 1, rotationY: 1.57 },
      },
    })
    expect(created.statusCode).toBe(201)
    expect(created.json().fileUrl).toBe(`/api/3d/files/${uploaded.json().id}`)
    expect(created.json().thumbnailFileId).toBe(thumbnail.json().id)
    expect(created.json().thumbnailUrl).toBe(`/api/3d/files/${thumbnail.json().id}`)
    expect(created.json().config.rotationY).toBe(1.57)

    const list = await ctx.app.inject({ url: '/api/3d/imported-models' })
    expect(list.json()).toHaveLength(1)
    expect(list.json()[0].name).toBe('呼吸机')

    const id = created.json().id
    const deleted = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/3d/imported-models/${id}`,
    })
    expect(deleted.statusCode).toBe(200)
  })

  it('fileId 必须是 GLB 文件', async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
    const body = multipartBody('thumb.png', 'image/png', png)
    const uploaded = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/files',
      payload: body.payload,
      headers: body.headers,
    })

    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/imported-models',
      payload: { name: '错误文件', fileId: uploaded.json().id },
    })
    expect(created.statusCode).toBe(400)
    expect(created.json().field).toBe('fileId')
  })

  it('按分类与名称过滤，非法参数与不存在资源返回错误', async () => {
    const category = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/categories',
      payload: { name: '医疗设备' },
    })
    const categoryId = category.json().id
    const uploaded = await uploadGlb(ctx, 'ventilator.glb', 'filter-ventilator')
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/imported-models',
      payload: { name: '呼吸机', fileId: uploaded.json().id, categoryId },
    })
    const id = created.json().id

    const byCategory = await ctx.app.inject({
      url: `/api/3d/imported-models?categoryId=${categoryId}`,
    })
    expect(byCategory.json()).toHaveLength(1)

    const byQuery = await ctx.app.inject({
      url: `/api/3d/imported-models?q=${encodeURIComponent('呼吸')}`,
    })
    expect(byQuery.json().map((row: { id: number }) => row.id)).toEqual([id])

    const repeated = await ctx.app.inject({ url: '/api/3d/imported-models?q=a&q=b' })
    expect(repeated.statusCode).toBe(400)

    const badId = await ctx.app.inject({ url: '/api/3d/imported-models/1e300' })
    expect(badId.statusCode).toBe(400)

    const missing = await ctx.app.inject({ url: '/api/3d/imported-models/999' })
    expect(missing.statusCode).toBe(404)

    const missingUpdate = await ctx.app.inject({
      method: 'PUT',
      url: '/api/3d/imported-models/999',
      payload: { name: 'X', fileId: uploaded.json().id },
    })
    expect(missingUpdate.statusCode).toBe(404)
  })

  it('PUT 全量更新并清空省略字段', async () => {
    const first = await uploadGlb(ctx, 'ventilator.glb', 'put-first')
    const second = await uploadGlb(ctx, 'monitor.glb', 'put-second')
    const thumbnail = await uploadImage(ctx, 'thumb.png')
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/imported-models',
      payload: {
        name: '呼吸机',
        fileId: first.json().id,
        thumbnailFileId: thumbnail.json().id,
        width: 0.8,
        depth: 0.6,
        height: 1.4,
        config: { scale: 1 },
      },
    })
    expect(created.statusCode).toBe(201)
    const id = created.json().id

    const updated = await ctx.app.inject({
      method: 'PUT',
      url: `/api/3d/imported-models/${id}`,
      payload: { name: '呼吸机（改）', fileId: second.json().id },
    })
    expect(updated.statusCode).toBe(200)
    expect(updated.json().name).toBe('呼吸机（改）')
    expect(updated.json().fileId).toBe(second.json().id)
    expect(updated.json().width).toBeNull()
    expect(updated.json().depth).toBeNull()
    expect(updated.json().height).toBeNull()
    expect(updated.json().thumbnailFileId).toBeNull()

    const detail = await ctx.app.inject({ url: `/api/3d/imported-models/${id}` })
    expect(detail.statusCode).toBe(200)
    expect(detail.json().name).toBe('呼吸机（改）')
    expect(detail.json().fileId).toBe(second.json().id)
    expect(detail.json().width).toBeNull()
    expect(detail.json().depth).toBeNull()
    expect(detail.json().height).toBeNull()
  })

  it('删除后模型 404 但保留文件', async () => {
    const uploaded = await uploadGlb(ctx, 'ventilator.glb', 'delete-keep-file')
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/imported-models',
      payload: { name: '呼吸机', fileId: uploaded.json().id },
    })
    expect(created.statusCode).toBe(201)
    const id = created.json().id
    const fileId = uploaded.json().id

    const deleted = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/3d/imported-models/${id}`,
    })
    expect(deleted.statusCode).toBe(200)
    expect(deleted.json()).toEqual({ ok: true })

    const missing = await ctx.app.inject({ url: `/api/3d/imported-models/${id}` })
    expect(missing.statusCode).toBe(404)

    const meta = await ctx.app.inject({ url: `/api/3d/files/${fileId}/meta` })
    expect(meta.statusCode).toBe(200)
  })

  it('拒绝超出 32 位整数的路由 id', async () => {
    const res = await ctx.app.inject({ url: '/api/3d/imported-models/3000000000' })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('无效的 id')
  })

  it('configJson 损坏时列表与详情返回固定错误', async () => {
    const uploaded = await uploadGlb(ctx, 'corrupt.glb', 'corrupt-config')
    const row = await ctx.prisma.importedModel.create({
      data: { name: '损坏模型', fileId: uploaded.json().id, configJson: '{bad' },
    })

    const list = await ctx.app.inject({ url: '/api/3d/imported-models' })
    expect(list.statusCode).toBe(500)
    expect(list.json()).toEqual({ error: '模型配置已损坏' })
    expect(list.body).not.toContain('Unexpected token')

    const detail = await ctx.app.inject({ url: `/api/3d/imported-models/${row.id}` })
    expect(detail.statusCode).toBe(500)
    expect(detail.json()).toEqual({ error: '模型配置已损坏' })
    expect(detail.body).not.toContain('Unexpected token')
  })
})
