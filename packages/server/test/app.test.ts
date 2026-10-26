import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestContext, type TestContext } from './helpers.js'

let ctx: TestContext

beforeAll(async () => {
  ctx = await createTestContext()
})

afterAll(async () => {
  await ctx?.cleanup()
})

describe('app 装配', () => {
  it('保留原有演示接口', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/demo/ward-kv-single' })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json().data)).toBe(true)
  })

  it('保留自定义图标接口', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/custom-icons' })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
  })
})
