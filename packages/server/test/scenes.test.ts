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

function sceneDocument(rooms: unknown[] = []) {
  return { version: 2, rooms, nodes: [], modelLibrary: [] }
}

let ctx: TestContext

beforeEach(async () => {
  ctx = await createTestContext()
})

afterEach(async () => {
  await ctx.cleanup()
})

describe('场景接口', () => {
  it('创建、列表、详情、更新与删除场景', async () => {
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/scenes',
      payload: { name: '一层病房', description: '初始快照', sceneJson: sceneDocument() },
    })
    expect(created.statusCode).toBe(201)
    expect(created.json().name).toBe('一层病房')
    expect(created.json().scene).toEqual(sceneDocument())

    const list = await ctx.app.inject({ url: '/api/3d/scenes' })
    expect(list.statusCode).toBe(200)
    expect(list.json()).toHaveLength(1)
    expect(list.json()[0].name).toBe('一层病房')
    expect(list.json()[0]).not.toHaveProperty('scene')
    expect(list.json()[0]).not.toHaveProperty('sceneJson')

    const id = created.json().id
    const detail = await ctx.app.inject({ url: `/api/3d/scenes/${id}` })
    expect(detail.statusCode).toBe(200)
    expect(detail.json().scene.rooms).toEqual([])

    const updated = await ctx.app.inject({
      method: 'PUT',
      url: `/api/3d/scenes/${id}`,
      payload: {
        name: '一层病房（改）',
        sceneJson: JSON.stringify(sceneDocument([{ id: 'room-1' }])),
      },
    })
    expect(updated.statusCode).toBe(200)
    expect(updated.json().name).toBe('一层病房（改）')
    expect(updated.json().scene.rooms).toEqual([{ id: 'room-1' }])

    const deleted = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/3d/scenes/${id}`,
    })
    expect(deleted.statusCode).toBe(200)
    expect(deleted.json()).toEqual({ ok: true })

    const missing = await ctx.app.inject({ url: `/api/3d/scenes/${id}` })
    expect(missing.statusCode).toBe(404)
    expect(missing.json().error).toBe('场景不存在')
  })

  it('校验 sceneJson 结构与 JSON 合法性', async () => {
    const missingVersion = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/scenes',
      payload: { name: '坏场景', sceneJson: { rooms: [], nodes: [], modelLibrary: [] } },
    })
    expect(missingVersion.statusCode).toBe(400)
    expect(missingVersion.json().field).toBe('sceneJson.version')

    const badJson = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/scenes',
      payload: { name: '坏场景', sceneJson: '{not json' },
    })
    expect(badJson.statusCode).toBe(400)
    expect(badJson.json().field).toBe('sceneJson')
  })

  it('拒绝过深的 sceneJson 且不泄露异常', async () => {
    const deep = '{"a":'.repeat(20000) + '1' + '}'.repeat(20000)
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/scenes',
      payload: JSON.stringify({ name: '深场景', sceneJson: deep }),
      headers: { 'content-type': 'application/json' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().field).toBe('sceneJson')
    expect(res.body).not.toContain('Maximum call stack')
  })

  it('缩略图必须是图片', async () => {
    const glb = await uploadGlb(ctx, 'scene.glb', 'scene-thumb-glb')
    const rejected = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/scenes',
      payload: { name: '场景', sceneJson: sceneDocument(), thumbnailFileId: glb.json().id },
    })
    expect(rejected.statusCode).toBe(400)
    expect(rejected.json().field).toBe('thumbnailFileId')

    const image = await uploadImage(ctx, 'scene.png')
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/scenes',
      payload: { name: '场景', sceneJson: sceneDocument(), thumbnailFileId: image.json().id },
    })
    expect(created.statusCode).toBe(201)
    expect(created.json().thumbnailFileId).toBe(image.json().id)
    expect(created.json().thumbnailUrl).toBe(`/api/3d/files/${image.json().id}`)

    const detail = await ctx.app.inject({ url: `/api/3d/scenes/${created.json().id}` })
    expect(detail.statusCode).toBe(200)
    expect(detail.json().thumbnailFileId).toBe(image.json().id)

    const deleted = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/3d/scenes/${created.json().id}`,
    })
    expect(deleted.statusCode).toBe(200)
    const meta = await ctx.app.inject({ url: `/api/3d/files/${image.json().id}/meta` })
    expect(meta.statusCode).toBe(200)
  })

  it('sceneJson 损坏时返回固定错误', async () => {
    const row = await ctx.prisma.scene.create({
      data: { name: '损坏场景', sceneJson: '{broken' },
    })
    const res = await ctx.app.inject({ url: `/api/3d/scenes/${row.id}` })
    expect(res.statusCode).toBe(500)
    expect(res.json().error).toBe('场景 JSON 已损坏')

    const scalar = await ctx.prisma.scene.create({
      data: { name: '标量场景', sceneJson: 'null' },
    })
    const scalarRes = await ctx.app.inject({ url: `/api/3d/scenes/${scalar.id}` })
    expect(scalarRes.statusCode).toBe(500)
    expect(scalarRes.json().error).toBe('场景 JSON 已损坏')
  })

  it('更新时省略 thumbnailFileId 会清空缩略图', async () => {
    const image = await uploadImage(ctx, 'clear-thumb.png')
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/scenes',
      payload: { name: '带缩略图', sceneJson: sceneDocument(), thumbnailFileId: image.json().id },
    })
    expect(created.statusCode).toBe(201)
    expect(created.json().thumbnailUrl).toBe(`/api/3d/files/${image.json().id}`)

    const updated = await ctx.app.inject({
      method: 'PUT',
      url: `/api/3d/scenes/${created.json().id}`,
      payload: { name: '无缩略图', sceneJson: sceneDocument() },
    })
    expect(updated.statusCode).toBe(200)
    expect(updated.json().thumbnailFileId).toBeNull()
    expect(updated.json().thumbnailUrl).toBeNull()
  })

  it('缩略图文件不存在时拒绝创建', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/scenes',
      payload: { name: '场景', sceneJson: sceneDocument(), thumbnailFileId: 999999 },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().field).toBe('thumbnailFileId')
  })

  it('不存在或非法 id 返回错误', async () => {
    const missingGet = await ctx.app.inject({ url: '/api/3d/scenes/999' })
    expect(missingGet.statusCode).toBe(404)
    expect(missingGet.json().error).toBe('场景不存在')

    const missingPut = await ctx.app.inject({
      method: 'PUT',
      url: '/api/3d/scenes/999',
      payload: { name: '场景', sceneJson: sceneDocument() },
    })
    expect(missingPut.statusCode).toBe(404)
    expect(missingPut.json().error).toBe('场景不存在')

    const missingDelete = await ctx.app.inject({
      method: 'DELETE',
      url: '/api/3d/scenes/999',
    })
    expect(missingDelete.statusCode).toBe(404)
    expect(missingDelete.json().error).toBe('场景不存在')

    const badId = await ctx.app.inject({ url: '/api/3d/scenes/abc' })
    expect(badId.statusCode).toBe(400)
    expect(badId.json().error).toBe('无效的 id')

    const overflowId = await ctx.app.inject({ url: '/api/3d/scenes/3000000000' })
    expect(overflowId.statusCode).toBe(400)
    expect(overflowId.json().error).toBe('无效的 id')
  })

  it('列表按 updatedAt 倒序排列', async () => {
    const first = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/scenes',
      payload: { name: '场景一', sceneJson: sceneDocument() },
    })
    const second = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/scenes',
      payload: { name: '场景二', sceneJson: sceneDocument() },
    })
    expect(first.statusCode).toBe(201)
    expect(second.statusCode).toBe(201)

    await new Promise((resolve) => setTimeout(resolve, 10))
    const updated = await ctx.app.inject({
      method: 'PUT',
      url: `/api/3d/scenes/${first.json().id}`,
      payload: { name: '场景一（新）', sceneJson: sceneDocument() },
    })
    expect(updated.statusCode).toBe(200)

    const list = await ctx.app.inject({ url: '/api/3d/scenes' })
    expect(list.json().map((row: { name: string }) => row.name)).toEqual([
      '场景一（新）',
      '场景二',
    ])
  })
})
