import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createTestContext,
  multipartBody,
  sampleGlb,
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

describe('文件接口', () => {
  it('上传 GLB、去重并下载原始内容', async () => {
    const bytes = sampleGlb('bed')
    const first = await uploadGlb(ctx, 'bed.glb', 'bed')
    expect(first.statusCode).toBe(201)
    expect(first.json().mime).toBe('model/gltf-binary')
    expect(first.json().deduplicated).toBe(false)
    expect(Object.keys(first.json()).sort()).toEqual([
      'deduplicated',
      'id',
      'mime',
      'name',
      'sha256',
      'size',
      'url',
    ])

    const second = await uploadGlb(ctx, 'bed-copy.glb', 'bed')
    expect(second.statusCode).toBe(200)
    expect(second.json().deduplicated).toBe(true)
    expect(second.json().id).toBe(first.json().id)
    expect(Object.keys(second.json())).not.toContain('data')

    const download = await ctx.app.inject({
      url: `/api/3d/files/${first.json().id}`,
    })
    expect(download.statusCode).toBe(200)
    expect(download.headers['content-type']).toBe('model/gltf-binary')
    expect(download.headers['etag']).toBe(`"${first.json().sha256}"`)
    expect(Buffer.from(download.rawPayload).equals(bytes)).toBe(true)
  })

  it('接受 PNG 并拒绝不支持的格式', async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
    const body = multipartBody('thumb.png', 'image/png', png)
    const upload = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/files',
      payload: body.payload,
      headers: body.headers,
    })
    expect(upload.statusCode).toBe(201)
    expect(upload.json().mime).toBe('image/png')

    const badBody = multipartBody('note.txt', 'text/plain', Buffer.from('hello'))
    const bad = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/files',
      payload: badBody.payload,
      headers: badBody.headers,
    })
    expect(bad.statusCode).toBe(400)
  })

  it('被引用时拒绝删除，未引用可删除', async () => {
    const uploaded = await uploadGlb(ctx, 'bed.glb', 'bed-delete')
    const fileId = uploaded.json().id
    await ctx.prisma.systemModel.create({
      data: {
        key: 'device-x',
        name: 'X',
        kind: 'device',
        fileId,
        configJson: JSON.stringify({ deviceKind: 'bed', tagPrefix: 'BED' }),
      },
    })

    const blocked = await ctx.app.inject({ method: 'DELETE', url: `/api/3d/files/${fileId}` })
    expect(blocked.statusCode).toBe(409)

    const other = await uploadGlb(ctx, 'monitor.glb', 'monitor-delete')
    const deleted = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/3d/files/${other.json().id}`,
    })
    expect(deleted.statusCode).toBe(200)
  })
})
