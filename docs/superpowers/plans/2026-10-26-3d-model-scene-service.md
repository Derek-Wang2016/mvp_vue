# 3D 模型与场景服务实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `mvp_vue` 服务端增加分类、系统模型模板、导入模型、GLB 文件与 3D 场景的 SQLite 表与 REST API，并用 seed 导入 3ddemo 现有模型与场景。

**Architecture:** 五张 Prisma 表 + 启动时增量 DDL；系统模型用“常用列 + configJson”存储，场景整份快照；文件统一存 `AssetFile` BLOB 并按 sha256 去重；API 前缀 `/api/3d`，模型库接口输出与 3ddemo `ModelEntry` 兼容；测试使用临时 SQLite + `app.inject`。

**Tech Stack:** Node 20 + TypeScript strict、Fastify 4、Prisma 5 + SQLite、zod、@fastify/multipart 8、vitest 3。

**设计来源:** `docs/superpowers/specs/2026-10-26-3d-model-scene-service-design.md`

---

## 文件结构

**新增（服务端）**

| 文件 | 职责 |
|---|---|
| `packages/server/src/app.ts` | 创建 Fastify、注册 cors/multipart、装配全部路由 |
| `packages/server/src/demoRoutes.ts` | 从 `index.ts` 迁出的 2D 演示与代理路由 |
| `packages/server/src/customIconRoutes.ts` | 从 `index.ts` 迁出的自定义图标路由 |
| `packages/server/src/threeD/validation.ts` | zod 输入校验与 sceneJson 轻校验 |
| `packages/server/src/threeD/mappers.ts` | 数据库行 → API 响应 / ModelEntry 映射 |
| `packages/server/src/threeD/http.ts` | `sendError`、`parseId`、Prisma 错误判断 |
| `packages/server/src/threeD/refs.ts` | 分类、模型文件、缩略图的引用校验 |
| `packages/server/src/threeD/categories.ts` | 分类 CRUD |
| `packages/server/src/threeD/files.ts` | multipart 上传、下载、删除 |
| `packages/server/src/threeD/systemModels.ts` | 系统模型 CRUD |
| `packages/server/src/threeD/importedModels.ts` | 导入模型 CRUD |
| `packages/server/src/threeD/scenes.ts` | 场景 CRUD |
| `packages/server/src/threeD/modelLibrary.ts` | 运行时模型库输出 |
| `packages/server/src/threeD/registerThreeDRoutes.ts` | 汇总注册 3D 路由 |
| `packages/server/prisma/seed3d.ts` | 一次性导入脚本 |
| `packages/server/prisma/seed-assets/` | catalog、场景 JSON、8 个 GLB 副本 |
| `packages/server/vitest.config.ts` | vitest 配置 |
| `packages/server/test/helpers.ts` | 临时库、multipart、样例 GLB |
| `packages/server/test/*.test.ts` | 单元与接口测试 |

**修改**

| 文件 | 变更 |
|---|---|
| `packages/server/src/index.ts` | 精简为启动入口 |
| `packages/server/prisma/schema.prisma` | 增加 5 个 model |
| `packages/server/src/ensureDatabaseSchema.ts` | 增加建表/索引步骤 |
| `packages/server/package.json` | 依赖与 scripts |

---

### Task 1: 依赖与测试配置

**Files:**
- Modify: `packages/server/package.json`
- Create: `packages/server/vitest.config.ts`

- [ ] **Step 1: 安装依赖**

```bash
cd /c/HOME/VUE/prj/mvp_vue
pnpm -F @mvp-vue/server add zod@^3.23.8 @fastify/multipart@^8.3.0
pnpm -F @mvp-vue/server add -D vitest@^3.2.4
```

Expected: `packages/server/package.json` 出现 `zod`、`@fastify/multipart`、`vitest`。

- [ ] **Step 2: 增加 scripts**

编辑 `packages/server/package.json`，`scripts` 改为：

```json
"scripts": {
  "dev": "tsx --watch src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "db:push": "prisma db push",
  "db:seed": "tsx prisma/seed.ts",
  "db:seed:3d": "tsx prisma/seed3d.ts",
  "db:studio": "prisma studio",
  "test": "vitest run"
}
```

- [ ] **Step 3: 创建 vitest 配置**

`packages/server/vitest.config.ts`：

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    pool: 'forks',
    testTimeout: 20000,
    hookTimeout: 20000,
  },
})
```

- [ ] **Step 4: 验证 vitest 可用**

```bash
pnpm -F @mvp-vue/server exec vitest --version
```

Expected: 输出 `3.x.x`。

- [ ] **Step 5: 提交**

```bash
cd /c/HOME/VUE/prj/mvp_vue
git add packages/server/package.json packages/server/vitest.config.ts pnpm-lock.yaml
git commit -m "chore: 增加 3D 服务依赖与测试配置"
```

---

### Task 2: 拆分服务端应用装配

**Files:**
- Create: `packages/server/src/demoRoutes.ts`
- Create: `packages/server/src/customIconRoutes.ts`
- Create: `packages/server/src/threeD/registerThreeDRoutes.ts`
- Create: `packages/server/src/app.ts`
- Create: `packages/server/test/helpers.ts`
- Create: `packages/server/test/app.test.ts`
- Modify: `packages/server/src/index.ts`

- [ ] **Step 1: 写应用装配冒烟测试（先失败）**

`packages/server/test/app.test.ts`：

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestContext, type TestContext } from './helpers.js'

let ctx: TestContext

beforeAll(async () => {
  ctx = await createTestContext()
})

afterAll(async () => {
  await ctx.cleanup()
})

describe('app 装配', () => {
  it('保留原有演示接口', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/demo/ward-kv-single' })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json().data)).toBe(true)
  })
})
```

- [ ] **Step 2: 创建测试工具**

`packages/server/test/helpers.ts`：

```ts
import { randomUUID } from 'node:crypto'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app.js'
import { ensureDatabaseSchema } from '../src/ensureDatabaseSchema.js'

export interface TestContext {
  prisma: PrismaClient
  app: FastifyInstance
  cleanup: () => Promise<void>
}

const prismaDir = fileURLToPath(new URL('../prisma', import.meta.url))

export async function createTestContext(): Promise<TestContext> {
  const dbName = `test-${randomUUID()}.db`
  process.env.DATABASE_URL = `file:./${dbName}`
  const dbPath = join(prismaDir, dbName)
  const prisma = new PrismaClient()
  await ensureDatabaseSchema(prisma)
  const app = await buildApp(prisma, { logger: false })
  return {
    prisma,
    app,
    cleanup: async () => {
      await app.close()
      await prisma.$disconnect()
      for (const suffix of ['', '-journal', '-wal', '-shm']) {
        try {
          rmSync(dbPath + suffix, { force: true })
        } catch {
          // Windows 上句柄释放可能有延迟，测试文件已被 .gitignore 覆盖
        }
      }
    },
  }
}

export function multipartBody(filename: string, mime: string, bytes: Buffer) {
  const boundary = `----mvp3d${randomUUID()}`
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`,
  )
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`)
  return {
    payload: Buffer.concat([head, bytes, tail]),
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
  }
}

export function sampleGlb(tag: string): Buffer {
  const json = Buffer.from(JSON.stringify({ asset: { version: '2.0' }, tag }))
  const total = 12 + 8 + json.length
  const header = Buffer.alloc(12)
  header.write('glTF', 0, 'ascii')
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(total, 8)
  const chunk = Buffer.alloc(8)
  chunk.writeUInt32LE(json.length, 0)
  chunk.writeUInt32LE(0x4e4f534a, 4)
  return Buffer.concat([header, chunk, json])
}

export async function uploadGlb(ctx: TestContext, name: string, tag: string) {
  const body = multipartBody(name, 'model/gltf-binary', sampleGlb(tag))
  return ctx.app.inject({
    method: 'POST',
    url: '/api/3d/files',
    payload: body.payload,
    headers: body.headers,
  })
}
```

- [ ] **Step 3: 迁出演示与代理路由**

`packages/server/src/demoRoutes.ts`：

```ts
import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import {
  buildCountryMapStats,
  buildProvinceMapStats,
  parseMapStatsQuery,
  resolveProvinceOption,
  cacheMapGeoJson,
} from './mapStatsDemo.js'
import { buildCardListResponse, buildCardResponse } from './cardListDemo.js'
import { buildWardKvSingleResponse, buildWardKvMultiResponse } from './wardKvStatsDemo.js'

function extractByPath(obj: unknown, path: string): unknown {
  const clean = path.startsWith('$') ? path.slice(1) : path
  const trimmed = clean.replace(/^\./, '')
  if (!trimmed) return obj
  const segments = trimmed.split('.')
  let current: any = obj
  for (const seg of segments) {
    if (current == null) return null
    current = current[seg]
  }
  return current
}

export function registerDemoRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.post('/api/data-proxy', async (req, reply) => {
    const { url, method, headers, dataPath } = req.body as {
      url: string
      method?: string
      headers?: Record<string, string>
      dataPath?: string
    }

    if (!url) {
      reply.status(400).send({ error: 'url is required' })
      return
    }

    req.log.info({ dataProxyUrl: url }, 'data-proxy 转发地址')

    try {
      const reqHeaders: Record<string, string> = { ...headers }

      const upstream = await fetch(url, {
        method: method ?? 'GET',
        headers: reqHeaders,
      })

      if (!upstream.ok) {
        reply.status(502).send({ error: `Upstream returned ${upstream.status}` })
        return
      }

      let body = await upstream.json()

      if (dataPath) {
        body = extractByPath(body, dataPath)
      }

      reply.send({ data: body })
    } catch (err: any) {
      reply.status(502).send({ error: err.message })
    }
  })

  app.post('/api/query', async (req, reply) => {
    const { query } = req.body as { query: string }

    if (!query) {
      reply.status(400).send({ error: 'query is required' })
      return
    }

    try {
      const result = await prisma.$queryRawUnsafe(query)
      reply.send(JSON.parse(JSON.stringify({ data: result }, (_, v) =>
        typeof v === 'bigint' ? Number(v) : v
      )))
    } catch (err: any) {
      reply.status(500).send({ error: err.message })
    }
  })

  const MAP_GEO_UPSTREAM = 'https://geo.datav.aliyun.com/areas_v3/bound'
  const mapGeoCache = new Map<string, unknown>()

  app.get('/api/map-geo/:adcode', async (req, reply) => {
    const { adcode } = req.params as { adcode: string }
    if (!/^\d{6}$/.test(adcode) || adcode === '100000') {
      reply.status(400).send({ error: 'invalid adcode' })
      return
    }

    const cached = mapGeoCache.get(adcode)
    if (cached) {
      cacheMapGeoJson(adcode, cached)
      reply.send(cached)
      return
    }

    try {
      const upstream = await fetch(`${MAP_GEO_UPSTREAM}/${adcode}_full.json`)
      if (!upstream.ok) {
        reply.status(502).send({ error: `地图数据上游返回 ${upstream.status}` })
        return
      }
      const json = await upstream.json()
      mapGeoCache.set(adcode, json)
      cacheMapGeoJson(adcode, json)
      reply.send(json)
    } catch (err: any) {
      reply.status(502).send({ error: err.message ?? '地图数据加载失败' })
    }
  })

  app.get('/api/demo/map-stats', async (req, reply) => {
    const parsed = parseMapStatsQuery(req.query as Record<string, unknown>)
    if ('error' in parsed) {
      reply.status(parsed.status).send({ error: parsed.error })
      return
    }

    try {
      if (parsed.level === 'country') {
        reply.send(buildCountryMapStats(parsed.min, parsed.max))
        return
      }

      const resolved = resolveProvinceOption({
        province: parsed.province,
        adcode: parsed.adcode,
      })
      if ('error' in resolved) {
        reply.status(resolved.status).send({ error: resolved.error })
        return
      }

      const body = await buildProvinceMapStats(resolved.option, parsed.min, parsed.max)
      reply.send(body)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '生成地图测试数据失败'
      reply.status(502).send({ error: message })
    }
  })

  app.get('/api/demo/card-list', async (req, reply) => {
    const result = buildCardListResponse(req.query as Record<string, unknown>)
    if ('error' in result) {
      reply.status(result.status).send({ error: result.error })
      return
    }
    reply.send(result)
  })

  app.get('/api/demo/card', async (req, reply) => {
    const result = buildCardResponse(req.query as Record<string, unknown>)
    if ('error' in result) {
      reply.status(result.status).send({ error: result.error })
      return
    }
    reply.send(result)
  })

  app.get('/api/demo/ward-kv-single', async (_req, reply) => {
    reply.send(buildWardKvSingleResponse())
  })

  app.get('/api/demo/ward-kv-multi', async (_req, reply) => {
    reply.send(buildWardKvMultiResponse())
  })

  /** @deprecated 请用 /api/demo/map-stats?level=country；保留兼容旧页面 */
  app.get('/api/demo/live-data', async (_req, reply) => {
    const { data } = buildCountryMapStats(80, 520)
    reply.send({ data })
  })
}
```

- [ ] **Step 4: 迁出自定义图标路由**

`packages/server/src/customIconRoutes.ts`：

```ts
import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import {
  createCustomIcon,
  deleteCustomIcon,
  getCustomIconById,
  listCustomIcons,
  updateCustomIcon,
  validateCustomIconInput,
} from './customIcons.js'

export function registerCustomIconRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get('/api/custom-icons', async (req, reply) => {
    const query = req.query as { includeSvg?: string }
    const includeSvg = query.includeSvg === '1' || query.includeSvg === 'true'
    const items = await listCustomIcons(prisma, { includeSvg })
    reply.send(items)
  })

  app.get('/api/custom-icons/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const iconId = Number(id)
    if (!Number.isInteger(iconId) || iconId <= 0) {
      reply.status(400).send({ error: 'invalid id' })
      return
    }
    const icon = await getCustomIconById(prisma, iconId)
    if (!icon) {
      reply.status(404).send({ error: 'Custom icon not found' })
      return
    }
    reply.send(icon)
  })

  app.post('/api/custom-icons', async (req, reply) => {
    const body = req.body as { name?: unknown; svgContent?: unknown }
    const validation = validateCustomIconInput(body)
    if (validation) {
      reply.status(400).send({ error: validation.message, field: validation.field })
      return
    }
    const icon = await createCustomIcon(prisma, {
      name: String(body.name).trim(),
      svgContent: String(body.svgContent).trim(),
    })
    reply.status(201).send(icon)
  })

  app.put('/api/custom-icons/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const iconId = Number(id)
    if (!Number.isInteger(iconId) || iconId <= 0) {
      reply.status(400).send({ error: 'invalid id' })
      return
    }
    const body = req.body as { name?: unknown; svgContent?: unknown }
    if (body.name === undefined && body.svgContent === undefined) {
      reply.status(400).send({ error: '至少提供 name 或 svgContent 之一' })
      return
    }
    const validation = validateCustomIconInput(body)
    if (validation) {
      reply.status(400).send({ error: validation.message, field: validation.field })
      return
    }
    const icon = await updateCustomIcon(prisma, iconId, {
      ...(body.name !== undefined ? { name: String(body.name) } : {}),
      ...(body.svgContent !== undefined ? { svgContent: String(body.svgContent) } : {}),
    })
    if (!icon) {
      reply.status(404).send({ error: 'Custom icon not found' })
      return
    }
    reply.send(icon)
  })

  app.delete('/api/custom-icons/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const iconId = Number(id)
    if (!Number.isInteger(iconId) || iconId <= 0) {
      reply.status(400).send({ error: 'invalid id' })
      return
    }
    const deleted = await deleteCustomIcon(prisma, iconId)
    if (!deleted) {
      reply.status(404).send({ error: 'Custom icon not found' })
      return
    }
    reply.send({ success: true })
  })
}
```

- [ ] **Step 5: 创建 3D 路由注册占位**

`packages/server/src/threeD/registerThreeDRoutes.ts`：

```ts
import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'

export function registerThreeDRoutes(_app: FastifyInstance, _prisma: PrismaClient) {
  // 后续任务逐步注册 3D 路由
}
```

- [ ] **Step 6: 创建 app.ts**

`packages/server/src/app.ts`：

```ts
import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import type { PrismaClient } from '@prisma/client'
import { isStrictPagePolicy } from './pageScopePolicy.js'
import { registerDraftPageRoutes } from './routes/draftPages.js'
import { registerPublishPageRoutes } from './routes/publishPages.js'
import { registerEditableTextRoutes } from './editableTextRoutes.js'
import { registerHostedImageRoutes } from './hostedImageRoutes.js'
import { registerCustomIconRoutes } from './customIconRoutes.js'
import { registerDemoRoutes } from './demoRoutes.js'
import { registerThreeDRoutes } from './threeD/registerThreeDRoutes.js'

export async function buildApp(
  prisma: PrismaClient,
  options: { logger?: boolean } = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? true,
    bodyLimit: 8 * 1024 * 1024,
  })

  await app.register(cors, {
    origin: true,
    exposedHeaders: ['X-Skipped-Models'],
  })
  await app.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024, files: 1, fields: 20 },
  })

  registerDraftPageRoutes(app, prisma)
  registerPublishPageRoutes(app, prisma)
  registerEditableTextRoutes(app, prisma)
  registerHostedImageRoutes(app, prisma)
  registerCustomIconRoutes(app, prisma)
  registerThreeDRoutes(app, prisma)
  registerDemoRoutes(app, prisma)

  if (isStrictPagePolicy()) {
    console.log('PAGE_POLICY=strict：发布模式，调试表只读')
  }

  return app
}
```

- [ ] **Step 7: 精简 index.ts**

`packages/server/src/index.ts` 整体替换为：

```ts
import { PrismaClient } from '@prisma/client'
import { buildApp } from './app.js'
import { ensureDatabaseSchema } from './ensureDatabaseSchema.js'

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db'
}

const prisma = new PrismaClient()
const app = await buildApp(prisma)

try {
  const applied = await ensureDatabaseSchema(prisma)
  console.log('数据库文件:', process.env.DATABASE_URL ?? '(未设置)')
  if (applied.length > 0) {
    console.log('数据库结构已更新:', applied.join(', '))
  }
  await app.listen({ port: 3002, host: '0.0.0.0' })
  console.log('Server running at http://0.0.0.0:3002')
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
```

- [ ] **Step 8: 运行测试**

```bash
pnpm -F @mvp-vue/server test
```

Expected: `test/app.test.ts` 通过；若 `@prisma/client` 尚未生成会报错，先执行 `pnpm -F @mvp-vue/server exec prisma generate`。

- [ ] **Step 9: 类型检查**

```bash
pnpm -F @mvp-vue/server build
```

Expected: 无 TS 错误。

- [ ] **Step 10: 提交**

```bash
cd /c/HOME/VUE/prj/mvp_vue
git add packages/server/src/app.ts packages/server/src/demoRoutes.ts packages/server/src/customIconRoutes.ts packages/server/src/index.ts packages/server/src/threeD/registerThreeDRoutes.ts packages/server/test/helpers.ts packages/server/test/app.test.ts
git commit -m "refactor: 拆分服务端应用装配"
```

---

### Task 3: 数据表与启动建表

**Files:**
- Modify: `packages/server/prisma/schema.prisma`
- Modify: `packages/server/src/ensureDatabaseSchema.ts`
- Create: `packages/server/test/schema.test.ts`

- [ ] **Step 1: 写建表测试（先失败）**

`packages/server/test/schema.test.ts`：

```ts
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
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm -F @mvp-vue/server test test/schema.test.ts
```

Expected: FAIL，`缺少表 ModelCategory`。

- [ ] **Step 3: 扩展 Prisma schema**

在 `packages/server/prisma/schema.prisma` 末尾追加：

```prisma
/// 3D 模型分类（系统模型与导入模型共用）
model ModelCategory {
  id             Int             @id @default(autoincrement())
  name           String          @unique
  sortOrder      Int             @default(0)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  systemModels   SystemModel[]
  importedModels ImportedModel[]
}

/// 3D 二进制文件（GLB / 图片），按 sha256 去重
model AssetFile {
  id                      Int             @id @default(autoincrement())
  name                    String
  mime                    String
  size                    Int
  sha256                  String          @unique
  data                    Bytes
  createdAt               DateTime        @default(now())
  systemModelFiles        SystemModel[]   @relation("SystemModelFile")
  systemModelThumbnails   SystemModel[]   @relation("SystemModelThumbnail")
  importedModelFiles      ImportedModel[] @relation("ImportedModelFile")
  importedModelThumbnails ImportedModel[] @relation("ImportedModelThumbnail")
  sceneThumbnails         Scene[]         @relation("SceneThumbnail")
}

/// 系统模型模板
model SystemModel {
  id              Int            @id @default(autoincrement())
  key             String         @unique
  name            String
  categoryId      Int?
  kind            String
  width           Float?
  depth           Float?
  height          Float?
  fileId          Int?
  thumbnailFileId Int?
  configJson      String         @default("{}")
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  category        ModelCategory? @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  file            AssetFile?     @relation("SystemModelFile", fields: [fileId], references: [id], onDelete: Restrict)
  thumbnail       AssetFile?     @relation("SystemModelThumbnail", fields: [thumbnailFileId], references: [id], onDelete: Restrict)

  @@index([categoryId, kind])
}

/// 用户导入的 GLB 模型
model ImportedModel {
  id              Int            @id @default(autoincrement())
  name            String
  categoryId      Int?
  fileId          Int
  thumbnailFileId Int?
  width           Float?
  depth           Float?
  height          Float?
  configJson      String         @default("{}")
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  category        ModelCategory? @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  file            AssetFile      @relation("ImportedModelFile", fields: [fileId], references: [id], onDelete: Restrict)
  thumbnail       AssetFile?     @relation("ImportedModelThumbnail", fields: [thumbnailFileId], references: [id], onDelete: Restrict)

  @@index([categoryId])
}

/// 3D 场景（整份 SceneDocument v2 快照）
model Scene {
  id              Int         @id @default(autoincrement())
  name            String
  description     String?
  sceneJson       String
  thumbnailFileId Int?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  thumbnail       AssetFile?  @relation("SceneThumbnail", fields: [thumbnailFileId], references: [id], onDelete: Restrict)
}
```

- [ ] **Step 4: 生成 Prisma Client**

```bash
pnpm -F @mvp-vue/server exec prisma generate
```

Expected: `Generated Prisma Client`。

- [ ] **Step 5: 在 ensureDatabaseSchema 增加 DDL 常量与步骤**

在 `packages/server/src/ensureDatabaseSchema.ts` 的 `HOSTED_IMAGE_SQL` 之后追加：

```ts
const MODEL_CATEGORY_SQL = `CREATE TABLE IF NOT EXISTS "ModelCategory" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`

const ASSET_FILE_SQL = `CREATE TABLE IF NOT EXISTS "AssetFile" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "mime" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "data" BLOB NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`

const SYSTEM_MODEL_SQL = `CREATE TABLE IF NOT EXISTS "SystemModel" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "categoryId" INTEGER,
  "kind" TEXT NOT NULL,
  "width" REAL,
  "depth" REAL,
  "height" REAL,
  "fileId" INTEGER,
  "thumbnailFileId" INTEGER,
  "configJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemModel_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ModelCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SystemModel_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "AssetFile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SystemModel_thumbnailFileId_fkey" FOREIGN KEY ("thumbnailFileId") REFERENCES "AssetFile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`

const IMPORTED_MODEL_SQL = `CREATE TABLE IF NOT EXISTS "ImportedModel" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "categoryId" INTEGER,
  "fileId" INTEGER NOT NULL,
  "thumbnailFileId" INTEGER,
  "width" REAL,
  "depth" REAL,
  "height" REAL,
  "configJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportedModel_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ModelCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ImportedModel_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "AssetFile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ImportedModel_thumbnailFileId_fkey" FOREIGN KEY ("thumbnailFileId") REFERENCES "AssetFile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`

const SCENE_SQL = `CREATE TABLE IF NOT EXISTS "Scene" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sceneJson" TEXT NOT NULL,
  "thumbnailFileId" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Scene_thumbnailFileId_fkey" FOREIGN KEY ("thumbnailFileId") REFERENCES "AssetFile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`
```

在 `STEPS` 数组末尾追加：

```ts
  {
    id: '2026-10-26-3d-model-category',
    sql: MODEL_CATEGORY_SQL,
  },
  {
    id: '2026-10-26-3d-model-category-name-index',
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS "ModelCategory_name_key" ON "ModelCategory"("name")`,
  },
  {
    id: '2026-10-26-3d-asset-file',
    sql: ASSET_FILE_SQL,
  },
  {
    id: '2026-10-26-3d-asset-file-sha-index',
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS "AssetFile_sha256_key" ON "AssetFile"("sha256")`,
  },
  {
    id: '2026-10-26-3d-system-model',
    sql: SYSTEM_MODEL_SQL,
  },
  {
    id: '2026-10-26-3d-system-model-key-index',
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS "SystemModel_key_key" ON "SystemModel"("key")`,
  },
  {
    id: '2026-10-26-3d-system-model-category-index',
    sql: `CREATE INDEX IF NOT EXISTS "SystemModel_categoryId_kind_idx" ON "SystemModel"("categoryId", "kind")`,
  },
  {
    id: '2026-10-26-3d-imported-model',
    sql: IMPORTED_MODEL_SQL,
  },
  {
    id: '2026-10-26-3d-imported-model-category-index',
    sql: `CREATE INDEX IF NOT EXISTS "ImportedModel_categoryId_idx" ON "ImportedModel"("categoryId")`,
  },
  {
    id: '2026-10-26-3d-scene',
    sql: SCENE_SQL,
  },
```

- [ ] **Step 6: 运行测试确认通过**

```bash
pnpm -F @mvp-vue/server test test/schema.test.ts
```

Expected: PASS（2 个测试）。

- [ ] **Step 7: 提交**

```bash
cd /c/HOME/VUE/prj/mvp_vue
git add packages/server/prisma/schema.prisma packages/server/src/ensureDatabaseSchema.ts packages/server/test/schema.test.ts
git commit -m "feat: 增加 3D 模型与场景数据表"
```

---

### Task 4: 校验与映射

> **实现修正（代码评审后，2026-10-26）**
> - 所有数值 schema 使用 `.finite()`，拒绝 `Infinity`（JSON 里的 `1e999`）。
> - API 请求/响应字段名统一为 `config`；`zodError` 不再把 `config.*` 改写成 `configJson.*`。
> - `systemModelToLibraryEntry` 在配置解析失败、设备缺少 `fileId`、房间缺少宽/深时返回 `{ entry: null, skipped: true }`，由 `/api/3d/model-library` 汇总进 `X-Skipped-Models`，避免单条脏数据拖垮整个接口。

**Files:**
- Create: `packages/server/src/threeD/validation.ts`
- Create: `packages/server/src/threeD/mappers.ts`
- Create: `packages/server/test/validation.test.ts`

- [ ] **Step 1: 写校验与映射测试（先失败）**

`packages/server/test/validation.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import {
  deviceConfigSchema,
  normalizeSceneJson,
  roomConfigSchema,
  systemModelInputSchema,
} from '../src/threeD/validation.js'
import {
  importedModelToLibraryEntry,
  systemModelToLibraryEntry,
} from '../src/threeD/mappers.js'

describe('roomConfigSchema', () => {
  it('接受合法房间配置并补默认值', () => {
    const parsed = roomConfigSchema.parse({
      bedLayout: { count: 4, gap: 0.8, aisle: 1.6 },
    })
    expect(parsed.render).toBe('shell')
    expect(parsed.defaultKind).toBe('room')
    expect(parsed.bedLayout?.count).toBe(4)
  })

  it('拒绝非法床位数量与门朝向', () => {
    const count = roomConfigSchema.safeParse({ bedLayout: { count: 0 } })
    expect(count.success).toBe(false)
    if (!count.success) expect(count.error.issues[0]?.path).toEqual(['bedLayout', 'count'])

    const door = roomConfigSchema.safeParse({ door: { side: 'top' } })
    expect(door.success).toBe(false)
    if (!door.success) expect(door.error.issues[0]?.path).toEqual(['door', 'side'])
  })
})

describe('deviceConfigSchema', () => {
  it('接受合法设备配置并补初始状态', () => {
    const parsed = deviceConfigSchema.parse({ deviceKind: 'bed', tagPrefix: 'BED' })
    expect(parsed.initialStatus).toBe('normal')
    expect(parsed.metrics).toEqual([])
  })

  it('拒绝缺少 deviceKind', () => {
    const res = deviceConfigSchema.safeParse({ tagPrefix: 'BED' })
    expect(res.success).toBe(false)
  })
})

describe('systemModelInputSchema', () => {
  it('接受房间与设备模板', () => {
    const room = systemModelInputSchema.safeParse({
      key: 'room-ward',
      name: '病房',
      kind: 'room',
      width: 4.2,
      depth: 5,
      height: 2.8,
      config: { render: 'shell' },
    })
    expect(room.success).toBe(true)

    const device = systemModelInputSchema.safeParse({
      key: 'device-bed',
      name: '病床',
      kind: 'device',
      fileId: 3,
      config: { deviceKind: 'bed', tagPrefix: 'BED' },
    })
    expect(device.success).toBe(true)
  })

  it('拒绝缺少房间尺寸或设备文件', () => {
    const room = systemModelInputSchema.safeParse({
      key: 'room-x',
      name: 'X',
      kind: 'room',
      config: {},
    })
    expect(room.success).toBe(false)

    const device = systemModelInputSchema.safeParse({
      key: 'device-x',
      name: 'X',
      kind: 'device',
      config: { deviceKind: 'bed', tagPrefix: 'BED' },
    })
    expect(device.success).toBe(false)
  })
})

describe('normalizeSceneJson', () => {
  it('接受对象和 JSON 字符串', () => {
    const doc = { version: 2, rooms: [], nodes: [], modelLibrary: [] }
    expect(normalizeSceneJson(doc).ok).toBe(true)
    expect(normalizeSceneJson(JSON.stringify(doc)).ok).toBe(true)
  })

  it('拒绝缺少版本或数组字段', () => {
    expect(normalizeSceneJson({ rooms: [], nodes: [], modelLibrary: [] }).ok).toBe(false)
    expect(normalizeSceneJson({ version: 2, rooms: {}, nodes: [], modelLibrary: [] }).ok).toBe(false)
  })
})

describe('模型库映射', () => {
  const base = {
    categoryId: null,
    thumbnailFileId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  it('房间模板输出兼容 ModelEntry', () => {
    const row = {
      ...base,
      id: 1,
      key: 'room-ward',
      name: '病房',
      kind: 'room',
      width: 4.2,
      depth: 5,
      height: 2.8,
      fileId: null,
      configJson: JSON.stringify({ render: 'shell', defaultKind: 'room' }),
    }
    const { entry } = systemModelToLibraryEntry(row)
    expect(entry).toEqual({
      id: 'room-ward',
      label: '病房',
      category: 'room',
      render: 'shell',
      footprint: [4.2, 5],
      height: 2.8,
      defaultKind: 'room',
    })
  })

  it('设备模板输出 url 与 deviceKind', () => {
    const row = {
      ...base,
      id: 2,
      key: 'device-bed',
      name: '病床',
      kind: 'device',
      width: 2.1,
      depth: 1.063,
      height: null,
      fileId: 9,
      configJson: JSON.stringify({
        deviceKind: 'bed',
        tagPrefix: 'BED',
        initialStatus: 'standby',
      }),
    }
    const { entry } = systemModelToLibraryEntry(row)
    expect(entry?.url).toBe('/api/3d/files/9')
    expect(entry?.kind).toBe('bed')
    expect(entry?.footprint).toEqual([2.1, 1.063])
  })

  it('导入模型输出 imported id 与 source', () => {
    const row = {
      ...base,
      id: 7,
      name: '呼吸机',
      fileId: 11,
      width: 0.8,
      depth: 0.6,
      height: 1.4,
      configJson: JSON.stringify({ scale: 1 }),
    }
    const entry = importedModelToLibraryEntry(row)
    expect(entry.id).toBe('imported-7')
    expect(entry.source).toBe('imported')
    expect(entry.url).toBe('/api/3d/files/11')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm -F @mvp-vue/server test test/validation.test.ts
```

Expected: FAIL，模块不存在。

- [ ] **Step 3: 创建 validation.ts**

`packages/server/src/threeD/validation.ts`：

```ts
import { z } from 'zod'

export const vec3Schema = z.tuple([z.number(), z.number(), z.number()])
export const vec2Schema = z.tuple([z.number().positive(), z.number().positive()])
export const statusSchema = z.enum(['normal', 'warning', 'alarm', 'standby', 'calling', 'emergency'])
export const deviceKindSchema = z.enum(['rack', 'ahu', 'imaging', 'monitor', 'gas', 'bed', 'bedside', 'callhost'])
export const roomRenderSchema = z.enum(['glb', 'floor', 'shell'])
export const roomKindSchema = z.enum(['room', 'corridor'])
export const sideSchema = z.enum(['front', 'back', 'left', 'right'])
export const edgeOriginSchema = z.enum(['left', 'right'])
export const doorTypeSchema = z.enum(['single', 'double'])
export const bathroomCornerSchema = z.enum(['front-left', 'front-right', 'back-left', 'back-right'])

const metricSchema = z.object({
  label: z.string().min(1),
  value: z.string(),
})

const stateValueSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  color: z.string().min(1),
  opacity: z.number().min(0).max(1).optional(),
})

const stateDefinitionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  defaultValue: z.string().min(1),
  targets: z.array(z.string().min(1)).optional(),
  values: z.array(stateValueSchema).min(1),
})

const screenSchema = z.object({
  renderer: z.enum(['bedside', 'callhost']),
  position: vec3Schema,
  size: vec2Schema,
})

const statusStripSchema = z.object({
  position: vec3Schema,
  size: vec2Schema,
})

export const roomConfigSchema = z
  .object({
    render: roomRenderSchema.default('shell'),
    defaultKind: roomKindSchema.default('room'),
    walls: z
      .object({
        front: z.boolean(),
        back: z.boolean(),
        left: z.boolean(),
        right: z.boolean(),
      })
      .partial()
      .optional(),
    door: z
      .object({
        side: sideSchema,
        type: doorTypeSchema.default('single'),
        margin: z.number().nonnegative().optional(),
        from: edgeOriginSchema.optional(),
        open: z.boolean().optional(),
      })
      .optional(),
    windows: z
      .object({
        side: sideSchema.optional(),
        width: z.number().positive().optional(),
        count: z.number().int().positive().optional(),
        from: edgeOriginSchema.optional(),
        margin: z.number().nonnegative().optional(),
      })
      .optional(),
    bathroomCorner: bathroomCornerSchema.nullable().optional(),
    bedLayout: z
      .object({
        count: z.number().int().min(1).max(10),
        placement: z.enum(['both-sides', 'left', 'right']).default('both-sides'),
        gap: z.number().positive().optional(),
        aisle: z.number().positive().optional(),
      })
      .optional(),
    wallColor: z.string().min(1).optional(),
    floorColor: z.string().min(1).optional(),
    doorColor: z.string().min(1).optional(),
    showName: z.boolean().optional(),
  })
  .passthrough()

export const deviceConfigSchema = z
  .object({
    deviceKind: deviceKindSchema,
    tagPrefix: z.string().min(1).max(16),
    initialStatus: statusSchema.default('normal'),
    metrics: z.array(metricSchema).default([]),
    labelOffset: vec3Schema.optional(),
    lampOffset: vec3Schema.optional(),
    screen: screenSchema.optional(),
    statusStrip: statusStripSchema.optional(),
    states: z.array(stateDefinitionSchema).optional(),
    footprint: vec2Schema.optional(),
    castShadow: z.boolean().optional(),
    receiveShadow: z.boolean().optional(),
  })
  .passthrough()

export const importedConfigSchema = z
  .object({
    scale: z.number().positive().optional(),
    rotationY: z.number().optional(),
    offset: vec3Schema.optional(),
    castShadow: z.boolean().optional(),
    receiveShadow: z.boolean().optional(),
    labelOffset: vec3Schema.optional(),
  })
  .passthrough()

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(40),
  sortOrder: z.number().int().optional(),
})

const systemModelBaseShape = {
  key: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'key 只能包含小写字母、数字和连字符'),
  name: z.string().trim().min(1).max(80),
  categoryId: z.number().int().positive().nullable().optional(),
  width: z.number().positive().nullable().optional(),
  depth: z.number().positive().nullable().optional(),
  height: z.number().positive().nullable().optional(),
  fileId: z.number().int().positive().nullable().optional(),
  thumbnailFileId: z.number().int().positive().nullable().optional(),
}

const roomSystemModelInputSchema = z.object({
  ...systemModelBaseShape,
  kind: z.literal('room'),
  width: z.number().positive('房间宽度必须为正数'),
  depth: z.number().positive('房间深度必须为正数'),
  height: z.number().positive('房间高度必须为正数'),
  config: roomConfigSchema.default({}),
})

const deviceSystemModelInputSchema = z.object({
  ...systemModelBaseShape,
  kind: z.literal('device'),
  fileId: z.number().int().positive('设备模型必须提供 fileId'),
  config: deviceConfigSchema,
})

export const systemModelInputSchema = z.discriminatedUnion('kind', [
  roomSystemModelInputSchema,
  deviceSystemModelInputSchema,
])

export type SystemModelInput = z.infer<typeof systemModelInputSchema>

export const importedModelInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  categoryId: z.number().int().positive().nullable().optional(),
  fileId: z.number().int().positive(),
  thumbnailFileId: z.number().int().positive().nullable().optional(),
  width: z.number().positive().nullable().optional(),
  depth: z.number().positive().nullable().optional(),
  height: z.number().positive().nullable().optional(),
  config: importedConfigSchema.default({}),
})

export const sceneMetaSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  thumbnailFileId: z.number().int().positive().nullable().optional(),
})

const sceneDocumentShape = z
  .object({
    version: z.number(),
    rooms: z.array(z.unknown()),
    nodes: z.array(z.unknown()),
    modelLibrary: z.array(z.unknown()),
  })
  .passthrough()

export type SceneNormalizeResult =
  | { ok: true; value: string }
  | { ok: false; error: string; field: string }

export function normalizeSceneJson(input: unknown): SceneNormalizeResult {
  let candidate = input
  if (typeof input === 'string') {
    try {
      candidate = JSON.parse(input)
    } catch {
      return { ok: false, error: 'sceneJson 不是合法 JSON', field: 'sceneJson' }
    }
  }
  const parsed = sceneDocumentShape.safeParse(candidate)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const path = issue?.path.join('.')
    return {
      ok: false,
      error: issue?.message ?? 'sceneJson 结构不合法',
      field: path ? `sceneJson.${path}` : 'sceneJson',
    }
  }
  return { ok: true, value: JSON.stringify(candidate) }
}

export function zodError(error: z.ZodError): { message: string; field?: string } {
  const issue = error.issues[0]
  let field = issue?.path.length ? issue.path.join('.') : undefined
  if (field?.startsWith('config')) {
    field = `configJson${field.slice('config'.length)}`
  }
  return { message: issue?.message ?? '参数校验失败', field }
}
```

- [ ] **Step 4: 创建 mappers.ts**

`packages/server/src/threeD/mappers.ts`：

```ts
import type { ImportedModel, ModelCategory, Scene, SystemModel } from '@prisma/client'
import type { z } from 'zod'
import { deviceConfigSchema, importedConfigSchema, roomConfigSchema } from './validation.js'

type SystemModelWithCategory = SystemModel & { category: ModelCategory | null }
type ImportedModelWithCategory = ImportedModel & { category: ModelCategory | null }
type SceneMetaRow = Pick<
  Scene,
  'id' | 'name' | 'description' | 'thumbnailFileId' | 'createdAt' | 'updatedAt'
>

export function fileUrl(id: number | null | undefined): string | null {
  return id == null ? null : `/api/3d/files/${id}`
}

function parseJson<T>(schema: z.ZodType<T>, raw: string): T {
  return schema.parse(JSON.parse(raw))
}

export function formatCategory(row: ModelCategory) {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt,
  }
}

export function formatSystemModel(row: SystemModelWithCategory) {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    kind: row.kind,
    category: row.category ? { id: row.category.id, name: row.category.name } : null,
    width: row.width,
    depth: row.depth,
    height: row.height,
    fileUrl: fileUrl(row.fileId),
    thumbnailUrl: fileUrl(row.thumbnailFileId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function formatSystemModelDetail(row: SystemModelWithCategory) {
  const config =
    row.kind === 'room'
      ? parseJson(roomConfigSchema, row.configJson)
      : parseJson(deviceConfigSchema, row.configJson)
  return { ...formatSystemModel(row), config }
}

export function formatImportedModel(row: ImportedModelWithCategory) {
  return {
    id: row.id,
    name: row.name,
    category: row.category ? { id: row.category.id, name: row.category.name } : null,
    fileId: row.fileId,
    fileUrl: fileUrl(row.fileId),
    thumbnailUrl: fileUrl(row.thumbnailFileId),
    width: row.width,
    depth: row.depth,
    height: row.height,
    config: parseJson(importedConfigSchema, row.configJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function formatSceneMeta(row: SceneMetaRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    thumbnailUrl: fileUrl(row.thumbnailFileId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function systemModelToLibraryEntry(
  row: SystemModel,
): { entry: Record<string, unknown> | null; skipped: boolean } {
  if (row.kind === 'room') {
    const config = parseJson(roomConfigSchema, row.configJson)
    const entry: Record<string, unknown> = {
      id: row.key,
      label: row.name,
      category: 'room',
      render: config.render,
      footprint: [row.width ?? 0, row.depth ?? 0],
      height: row.height ?? 2.8,
      defaultKind: config.defaultKind,
    }
    if (config.render === 'glb' && row.fileId != null) {
      entry.url = fileUrl(row.fileId)
    }
    return { entry, skipped: false }
  }

  if (row.fileId == null) {
    return { entry: null, skipped: true }
  }

  const config = parseJson(deviceConfigSchema, row.configJson)
  const entry: Record<string, unknown> = {
    id: row.key,
    label: row.name,
    category: 'device',
    url: fileUrl(row.fileId),
    kind: config.deviceKind,
    tagPrefix: config.tagPrefix,
    initialStatus: config.initialStatus,
    metrics: config.metrics,
    labelOffset: config.labelOffset ?? [0, 2, 0],
    lampOffset: config.lampOffset ?? [0, 1.5, 0],
  }
  if (config.screen) entry.screen = config.screen
  if (config.statusStrip) entry.statusStrip = config.statusStrip
  if (config.states) entry.states = config.states
  if (row.width != null && row.depth != null) entry.footprint = [row.width, row.depth]
  else if (config.footprint) entry.footprint = config.footprint

  return { entry, skipped: false }
}

export function importedModelToLibraryEntry(row: ImportedModel) {
  return {
    id: `imported-${row.id}`,
    label: row.name,
    category: 'device',
    source: 'imported',
    url: fileUrl(row.fileId),
    ...(row.width != null && row.depth != null ? { footprint: [row.width, row.depth] } : {}),
    config: parseJson(importedConfigSchema, row.configJson),
  }
}
```

- [ ] **Step 5: 运行测试确认通过**

```bash
pnpm -F @mvp-vue/server test test/validation.test.ts
```

Expected: PASS（全部用例）。

- [ ] **Step 6: 提交**

```bash
cd /c/HOME/VUE/prj/mvp_vue
git add packages/server/src/threeD/validation.ts packages/server/src/threeD/mappers.ts packages/server/test/validation.test.ts
git commit -m "feat: 增加 3D 配置校验与映射"
```

---

### Task 5: 分类接口

**Files:**
- Create: `packages/server/src/threeD/http.ts`
- Create: `packages/server/src/threeD/categories.ts`
- Modify: `packages/server/src/threeD/registerThreeDRoutes.ts`
- Create: `packages/server/test/categories.test.ts`

- [ ] **Step 1: 写分类接口测试（先失败）**

`packages/server/test/categories.test.ts`：

```ts
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
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm -F @mvp-vue/server test test/categories.test.ts
```

Expected: FAIL，404（路由未注册）。

- [ ] **Step 3: 创建 http.ts**

`packages/server/src/threeD/http.ts`：

```ts
import type { FastifyReply } from 'fastify'

export function sendError(
  reply: FastifyReply,
  status: number,
  error: string,
  field?: string,
) {
  reply.status(status).send(field ? { error, field } : { error })
}

export function parseId(raw: string): number | null {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

export function isPrismaError(err: unknown, code: string): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === code
  )
}
```

- [ ] **Step 4: 创建 categories.ts**

`packages/server/src/threeD/categories.ts`：

```ts
import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { categoryInputSchema, zodError } from './validation.js'
import { formatCategory } from './mappers.js'
import { isPrismaError, parseId, sendError } from './http.js'

export function registerCategoryRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get('/api/3d/categories', async (_req, reply) => {
    const rows = await prisma.modelCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    })
    reply.send(rows.map(formatCategory))
  })

  app.post('/api/3d/categories', async (req, reply) => {
    const parsed = categoryInputSchema.safeParse(req.body)
    if (!parsed.success) {
      const error = zodError(parsed.error)
      sendError(reply, 400, error.message, error.field)
      return
    }
    try {
      const row = await prisma.modelCategory.create({
        data: {
          name: parsed.data.name,
          sortOrder: parsed.data.sortOrder ?? 0,
        },
      })
      reply.status(201).send(formatCategory(row))
    } catch (err) {
      if (isPrismaError(err, 'P2002')) {
        sendError(reply, 409, '分类名称已存在', 'name')
        return
      }
      throw err
    }
  })

  app.put('/api/3d/categories/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, 'invalid id')
      return
    }
    const parsed = categoryInputSchema.partial().safeParse(req.body)
    if (!parsed.success) {
      const error = zodError(parsed.error)
      sendError(reply, 400, error.message, error.field)
      return
    }
    if (parsed.data.name === undefined && parsed.data.sortOrder === undefined) {
      sendError(reply, 400, '至少提供 name 或 sortOrder 之一')
      return
    }
    try {
      const row = await prisma.modelCategory.update({
        where: { id },
        data: {
          ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
          ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
        },
      })
      reply.send(formatCategory(row))
    } catch (err) {
      if (isPrismaError(err, 'P2025')) {
        sendError(reply, 404, '分类不存在')
        return
      }
      if (isPrismaError(err, 'P2002')) {
        sendError(reply, 409, '分类名称已存在', 'name')
        return
      }
      throw err
    }
  })

  app.delete('/api/3d/categories/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, 'invalid id')
      return
    }
    const [systemCount, importedCount] = await Promise.all([
      prisma.systemModel.count({ where: { categoryId: id } }),
      prisma.importedModel.count({ where: { categoryId: id } }),
    ])
    if (systemCount + importedCount > 0) {
      sendError(reply, 409, '分类仍被模型引用，无法删除')
      return
    }
    try {
      await prisma.modelCategory.delete({ where: { id } })
      reply.send({ ok: true })
    } catch (err) {
      if (isPrismaError(err, 'P2025')) {
        sendError(reply, 404, '分类不存在')
        return
      }
      throw err
    }
  })
}
```

- [ ] **Step 5: 注册分类路由**

`packages/server/src/threeD/registerThreeDRoutes.ts` 改为：

```ts
import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { registerCategoryRoutes } from './categories.js'

export function registerThreeDRoutes(app: FastifyInstance, prisma: PrismaClient) {
  registerCategoryRoutes(app, prisma)
}
```

- [ ] **Step 6: 运行测试确认通过**

```bash
pnpm -F @mvp-vue/server test test/categories.test.ts
```

Expected: PASS（3 个测试）。

- [ ] **Step 7: 提交**

```bash
cd /c/HOME/VUE/prj/mvp_vue
git add packages/server/src/threeD/http.ts packages/server/src/threeD/categories.ts packages/server/src/threeD/registerThreeDRoutes.ts packages/server/test/categories.test.ts
git commit -m "feat: 增加 3D 分类接口"
```

---

### Task 6: 文件接口

**Files:**
- Create: `packages/server/src/threeD/refs.ts`
- Create: `packages/server/src/threeD/files.ts`
- Modify: `packages/server/src/threeD/registerThreeDRoutes.ts`
- Create: `packages/server/test/files.test.ts`

- [ ] **Step 1: 写文件接口测试（先失败）**

`packages/server/test/files.test.ts`：

```ts
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

    const second = await uploadGlb(ctx, 'bed-copy.glb', 'bed')
    expect(second.statusCode).toBe(200)
    expect(second.json().deduplicated).toBe(true)
    expect(second.json().id).toBe(first.json().id)

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
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm -F @mvp-vue/server test test/files.test.ts
```

Expected: FAIL，404。

- [ ] **Step 3: 创建 refs.ts**

`packages/server/src/threeD/refs.ts`：

```ts
import type { PrismaClient } from '@prisma/client'

export async function categoryRefError(
  prisma: PrismaClient,
  categoryId: number | null | undefined,
): Promise<string | null> {
  if (categoryId == null) return null
  const row = await prisma.modelCategory.findUnique({ where: { id: categoryId } })
  return row ? null : '分类不存在'
}

export async function modelFileError(
  prisma: PrismaClient,
  fileId: number | null | undefined,
): Promise<string | null> {
  if (fileId == null) return null
  const row = await prisma.assetFile.findUnique({ where: { id: fileId } })
  if (!row) return '文件不存在'
  if (row.mime !== 'model/gltf-binary') return 'fileId 必须是 GLB 文件'
  return null
}

export async function thumbnailRefError(
  prisma: PrismaClient,
  fileId: number | null | undefined,
): Promise<string | null> {
  if (fileId == null) return null
  const row = await prisma.assetFile.findUnique({ where: { id: fileId } })
  if (!row) return '缩略图不存在'
  if (!row.mime.startsWith('image/')) return '缩略图必须是图片'
  return null
}
```

- [ ] **Step 4: 创建 files.ts**

`packages/server/src/threeD/files.ts`：

```ts
import { createHash } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import type { MultipartFile } from '@fastify/multipart'
import type { PrismaClient } from '@prisma/client'
import { fileUrl } from './mappers.js'
import { isPrismaError, parseId, sendError } from './http.js'

function detectMime(bytes: Buffer): string | null {
  if (bytes.length >= 4 && bytes.toString('ascii', 0, 4) === 'glTF') {
    return 'model/gltf-binary'
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes.toString('ascii', 1, 4) === 'PNG') {
    return 'image/png'
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
}

export function registerFileRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.post('/api/3d/files', async (req, reply) => {
    let part: MultipartFile | undefined
    try {
      part = await req.file()
    } catch (err) {
      const code = (err as { code?: string }).code
      sendError(
        reply,
        code === 'FST_REQ_FILE_TOO_LARGE' ? 413 : 400,
        '文件上传失败（仅支持 multipart/form-data，单文件不超过 50MB）',
        'file',
      )
      return
    }
    if (!part) {
      sendError(reply, 400, '缺少 file 字段', 'file')
      return
    }

    let bytes: Buffer
    try {
      bytes = await part.toBuffer()
    } catch {
      sendError(reply, 413, '文件超过 50MB 限制', 'file')
      return
    }
    if (part.file.truncated) {
      sendError(reply, 413, '文件超过 50MB 限制', 'file')
      return
    }

    const mime = detectMime(bytes)
    if (!mime) {
      sendError(reply, 400, '仅支持 GLB、PNG、JPEG、WEBP 文件', 'file')
      return
    }

    const sha256 = createHash('sha256').update(bytes).digest('hex')
    const existing = await prisma.assetFile.findUnique({ where: { sha256 } })
    if (existing) {
      reply.send({
        id: existing.id,
        name: existing.name,
        mime: existing.mime,
        size: existing.size,
        sha256,
        url: fileUrl(existing.id),
        deduplicated: true,
      })
      return
    }

    const row = await prisma.assetFile.create({
      data: {
        name: part.filename || 'file',
        mime,
        size: bytes.length,
        sha256,
        data: bytes,
      },
    })
    reply.status(201).send({
      id: row.id,
      name: row.name,
      mime: row.mime,
      size: row.size,
      sha256,
      url: fileUrl(row.id),
      deduplicated: false,
    })
  })

  app.get('/api/3d/files/:id/meta', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, 'invalid id')
      return
    }
    const row = await prisma.assetFile.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        mime: true,
        size: true,
        sha256: true,
        createdAt: true,
      },
    })
    if (!row) {
      sendError(reply, 404, '文件不存在')
      return
    }
    reply.send(row)
  })

  app.get('/api/3d/files/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, 'invalid id')
      return
    }
    const row = await prisma.assetFile.findUnique({
      where: { id },
      select: { name: true, mime: true, sha256: true, data: true },
    })
    if (!row) {
      sendError(reply, 404, '文件不存在')
      return
    }
    const query = req.query as { download?: string }
    const body = Buffer.from(row.data)
    reply
      .header('Content-Type', row.mime)
      .header('Content-Length', String(body.length))
      .header('ETag', `"${row.sha256}"`)
      .header('Cache-Control', 'public, max-age=31536000, immutable')
    if (query.download === '1') {
      reply.header(
        'Content-Disposition',
        `attachment; filename*=UTF-8''${encodeURIComponent(row.name)}`,
      )
    }
    reply.send(body)
  })

  app.delete('/api/3d/files/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, 'invalid id')
      return
    }
    const row = await prisma.assetFile.findUnique({ where: { id }, select: { id: true } })
    if (!row) {
      sendError(reply, 404, '文件不存在')
      return
    }
    const [systemCount, importedCount, sceneCount] = await Promise.all([
      prisma.systemModel.count({
        where: { OR: [{ fileId: id }, { thumbnailFileId: id }] },
      }),
      prisma.importedModel.count({
        where: { OR: [{ fileId: id }, { thumbnailFileId: id }] },
      }),
      prisma.scene.count({ where: { thumbnailFileId: id } }),
    ])
    if (systemCount + importedCount + sceneCount > 0) {
      const refs = [
        systemCount > 0 ? `系统模型 ${systemCount} 个` : null,
        importedCount > 0 ? `导入模型 ${importedCount} 个` : null,
        sceneCount > 0 ? `场景 ${sceneCount} 个` : null,
      ].filter(Boolean)
      sendError(reply, 409, `文件正被引用（${refs.join('、')}），无法删除`)
      return
    }
    try {
      await prisma.assetFile.delete({ where: { id } })
      reply.send({ ok: true })
    } catch (err) {
      if (isPrismaError(err, 'P2025')) {
        sendError(reply, 404, '文件不存在')
        return
      }
      throw err
    }
  })
}
```

- [ ] **Step 5: 注册文件路由**

`packages/server/src/threeD/registerThreeDRoutes.ts` 改为：

```ts
import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { registerCategoryRoutes } from './categories.js'
import { registerFileRoutes } from './files.js'

export function registerThreeDRoutes(app: FastifyInstance, prisma: PrismaClient) {
  registerCategoryRoutes(app, prisma)
  registerFileRoutes(app, prisma)
}
```

- [ ] **Step 6: 运行测试确认通过**

```bash
pnpm -F @mvp-vue/server test test/files.test.ts
```

Expected: PASS（3 个测试）。

- [ ] **Step 7: 提交**

```bash
cd /c/HOME/VUE/prj/mvp_vue
git add packages/server/src/threeD/refs.ts packages/server/src/threeD/files.ts packages/server/src/threeD/registerThreeDRoutes.ts packages/server/test/files.test.ts
git commit -m "feat: 增加 3D 文件接口"
```

---

### Task 7: 系统模型接口

**Files:**
- Create: `packages/server/src/threeD/systemModels.ts`
- Modify: `packages/server/src/threeD/registerThreeDRoutes.ts`
- Create: `packages/server/test/systemModels.test.ts`

- [ ] **Step 1: 写系统模型接口测试（先失败）**

`packages/server/test/systemModels.test.ts`：

```ts
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
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm -F @mvp-vue/server test test/systemModels.test.ts
```

Expected: FAIL，404。

- [ ] **Step 3: 创建 systemModels.ts**

`packages/server/src/threeD/systemModels.ts`：

```ts
import type { FastifyInstance } from 'fastify'
import type { Prisma, PrismaClient } from '@prisma/client'
import {
  systemModelInputSchema,
  zodError,
  type SystemModelInput,
} from './validation.js'
import { formatSystemModel, formatSystemModelDetail } from './mappers.js'
import { isPrismaError, parseId, sendError } from './http.js'
import { categoryRefError, modelFileError, thumbnailRefError } from './refs.js'

function toRowData(input: SystemModelInput) {
  return {
    key: input.key,
    name: input.name,
    categoryId: input.categoryId ?? null,
    kind: input.kind,
    width: input.width ?? null,
    depth: input.depth ?? null,
    height: input.height ?? null,
    fileId: input.fileId ?? null,
    thumbnailFileId: input.thumbnailFileId ?? null,
    configJson: JSON.stringify(input.config),
  }
}

async function validateRefs(prisma: PrismaClient, input: SystemModelInput) {
  const categoryError = await categoryRefError(prisma, input.categoryId)
  if (categoryError) return { error: categoryError, field: 'categoryId' }
  const fileError = await modelFileError(prisma, input.fileId)
  if (fileError) return { error: fileError, field: 'fileId' }
  const thumbnailError = await thumbnailRefError(prisma, input.thumbnailFileId)
  if (thumbnailError) return { error: thumbnailError, field: 'thumbnailFileId' }
  if (input.kind === 'room' && input.config.render === 'glb' && input.fileId == null) {
    return { error: 'render=glb 的房间需要 fileId', field: 'fileId' }
  }
  return null
}

async function findModel(prisma: PrismaClient, raw: string) {
  const id = parseId(raw)
  const where: Prisma.SystemModelWhereUniqueInput =
    id != null && /^\d+$/.test(raw) ? { id } : { key: raw }
  return prisma.systemModel.findUnique({
    where,
    include: { category: true },
  })
}

export function registerSystemModelRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get('/api/3d/system-models', async (req, reply) => {
    const query = req.query as { categoryId?: string; kind?: string; q?: string }
    const where: Prisma.SystemModelWhereInput = {}

    if (query.categoryId !== undefined && query.categoryId !== '') {
      const categoryId = parseId(query.categoryId)
      if (categoryId == null) {
        sendError(reply, 400, 'invalid categoryId', 'categoryId')
        return
      }
      where.categoryId = categoryId
    }
    if (query.kind !== undefined && query.kind !== '') {
      if (query.kind !== 'room' && query.kind !== 'device') {
        sendError(reply, 400, 'kind 只能是 room 或 device', 'kind')
        return
      }
      where.kind = query.kind
    }
    if (query.q) {
      where.OR = [
        { key: { contains: query.q } },
        { name: { contains: query.q } },
      ]
    }

    const rows = await prisma.systemModel.findMany({
      where,
      include: { category: true },
      orderBy: { updatedAt: 'desc' },
    })
    reply.send(rows.map(formatSystemModel))
  })

  app.get('/api/3d/system-models/:idOrKey', async (req, reply) => {
    const raw = (req.params as { idOrKey: string }).idOrKey
    const row = await findModel(prisma, raw)
    if (!row) {
      sendError(reply, 404, '系统模型不存在')
      return
    }
    reply.send(formatSystemModelDetail(row))
  })

  app.post('/api/3d/system-models', async (req, reply) => {
    const parsed = systemModelInputSchema.safeParse(req.body)
    if (!parsed.success) {
      const error = zodError(parsed.error)
      sendError(reply, 400, error.message, error.field)
      return
    }
    const refError = await validateRefs(prisma, parsed.data)
    if (refError) {
      sendError(reply, 400, refError.error, refError.field)
      return
    }
    try {
      const row = await prisma.systemModel.create({
        data: toRowData(parsed.data),
        include: { category: true },
      })
      reply.status(201).send(formatSystemModelDetail(row))
    } catch (err) {
      if (isPrismaError(err, 'P2002')) {
        sendError(reply, 409, '模型 key 已存在', 'key')
        return
      }
      throw err
    }
  })

  app.put('/api/3d/system-models/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, 'invalid id')
      return
    }
    const parsed = systemModelInputSchema.safeParse(req.body)
    if (!parsed.success) {
      const error = zodError(parsed.error)
      sendError(reply, 400, error.message, error.field)
      return
    }
    const refError = await validateRefs(prisma, parsed.data)
    if (refError) {
      sendError(reply, 400, refError.error, refError.field)
      return
    }
    try {
      const row = await prisma.systemModel.update({
        where: { id },
        data: toRowData(parsed.data),
        include: { category: true },
      })
      reply.send(formatSystemModelDetail(row))
    } catch (err) {
      if (isPrismaError(err, 'P2025')) {
        sendError(reply, 404, '系统模型不存在')
        return
      }
      if (isPrismaError(err, 'P2002')) {
        sendError(reply, 409, '模型 key 已存在', 'key')
        return
      }
      throw err
    }
  })

  app.delete('/api/3d/system-models/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, 'invalid id')
      return
    }
    try {
      await prisma.systemModel.delete({ where: { id } })
      reply.send({ ok: true })
    } catch (err) {
      if (isPrismaError(err, 'P2025')) {
        sendError(reply, 404, '系统模型不存在')
        return
      }
      throw err
    }
  })
}
```

- [ ] **Step 4: 注册系统模型路由**

`packages/server/src/threeD/registerThreeDRoutes.ts` 改为：

```ts
import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { registerCategoryRoutes } from './categories.js'
import { registerFileRoutes } from './files.js'
import { registerSystemModelRoutes } from './systemModels.js'

export function registerThreeDRoutes(app: FastifyInstance, prisma: PrismaClient) {
  registerCategoryRoutes(app, prisma)
  registerFileRoutes(app, prisma)
  registerSystemModelRoutes(app, prisma)
}
```

- [ ] **Step 5: 运行测试确认通过**

```bash
pnpm -F @mvp-vue/server test test/systemModels.test.ts
```

Expected: PASS（4 个测试）。

- [ ] **Step 6: 提交**

```bash
cd /c/HOME/VUE/prj/mvp_vue
git add packages/server/src/threeD/systemModels.ts packages/server/src/threeD/registerThreeDRoutes.ts packages/server/test/systemModels.test.ts
git commit -m "feat: 增加 3D 系统模型接口"
```

---

### Task 8: 导入模型接口

**Files:**
- Create: `packages/server/src/threeD/importedModels.ts`
- Modify: `packages/server/src/threeD/registerThreeDRoutes.ts`
- Create: `packages/server/test/importedModels.test.ts`

- [ ] **Step 1: 写导入模型接口测试（先失败）**

`packages/server/test/importedModels.test.ts`：

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createTestContext,
  multipartBody,
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

describe('导入模型接口', () => {
  it('创建、列表与删除导入模型', async () => {
    const uploaded = await uploadGlb(ctx, 'ventilator.glb', 'ventilator')
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/imported-models',
      payload: {
        name: '呼吸机',
        fileId: uploaded.json().id,
        width: 0.8,
        depth: 0.6,
        height: 1.4,
        config: { scale: 1, rotationY: 1.57 },
      },
    })
    expect(created.statusCode).toBe(201)
    expect(created.json().fileUrl).toBe(`/api/3d/files/${uploaded.json().id}`)
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
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm -F @mvp-vue/server test test/importedModels.test.ts
```

Expected: FAIL，404。

- [ ] **Step 3: 创建 importedModels.ts**

`packages/server/src/threeD/importedModels.ts`：

```ts
import type { FastifyInstance } from 'fastify'
import type { Prisma, PrismaClient } from '@prisma/client'
import { importedModelInputSchema, zodError } from './validation.js'
import { formatImportedModel } from './mappers.js'
import { isPrismaError, parseId, sendError } from './http.js'
import { categoryRefError, modelFileError, thumbnailRefError } from './refs.js'

async function validateRefs(
  prisma: PrismaClient,
  input: { categoryId?: number | null; fileId: number; thumbnailFileId?: number | null },
) {
  const categoryError = await categoryRefError(prisma, input.categoryId)
  if (categoryError) return { error: categoryError, field: 'categoryId' }
  const fileError = await modelFileError(prisma, input.fileId)
  if (fileError) return { error: fileError, field: 'fileId' }
  const thumbnailError = await thumbnailRefError(prisma, input.thumbnailFileId)
  if (thumbnailError) return { error: thumbnailError, field: 'thumbnailFileId' }
  return null
}

export function registerImportedModelRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get('/api/3d/imported-models', async (req, reply) => {
    const query = req.query as { categoryId?: string; q?: string }
    const where: Prisma.ImportedModelWhereInput = {}

    if (query.categoryId !== undefined && query.categoryId !== '') {
      const categoryId = parseId(query.categoryId)
      if (categoryId == null) {
        sendError(reply, 400, 'invalid categoryId', 'categoryId')
        return
      }
      where.categoryId = categoryId
    }
    if (query.q) {
      where.name = { contains: query.q }
    }

    const rows = await prisma.importedModel.findMany({
      where,
      include: { category: true },
      orderBy: { updatedAt: 'desc' },
    })
    reply.send(rows.map(formatImportedModel))
  })

  app.get('/api/3d/imported-models/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, 'invalid id')
      return
    }
    const row = await prisma.importedModel.findUnique({
      where: { id },
      include: { category: true },
    })
    if (!row) {
      sendError(reply, 404, '导入模型不存在')
      return
    }
    reply.send(formatImportedModel(row))
  })

  app.post('/api/3d/imported-models', async (req, reply) => {
    const parsed = importedModelInputSchema.safeParse(req.body)
    if (!parsed.success) {
      const error = zodError(parsed.error)
      sendError(reply, 400, error.message, error.field)
      return
    }
    const refError = await validateRefs(prisma, parsed.data)
    if (refError) {
      sendError(reply, 400, refError.error, refError.field)
      return
    }
    const row = await prisma.importedModel.create({
      data: {
        name: parsed.data.name,
        categoryId: parsed.data.categoryId ?? null,
        fileId: parsed.data.fileId,
        thumbnailFileId: parsed.data.thumbnailFileId ?? null,
        width: parsed.data.width ?? null,
        depth: parsed.data.depth ?? null,
        height: parsed.data.height ?? null,
        configJson: JSON.stringify(parsed.data.config),
      },
      include: { category: true },
    })
    reply.status(201).send(formatImportedModel(row))
  })

  app.put('/api/3d/imported-models/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, 'invalid id')
      return
    }
    const parsed = importedModelInputSchema.safeParse(req.body)
    if (!parsed.success) {
      const error = zodError(parsed.error)
      sendError(reply, 400, error.message, error.field)
      return
    }
    const refError = await validateRefs(prisma, parsed.data)
    if (refError) {
      sendError(reply, 400, refError.error, refError.field)
      return
    }
    try {
      const row = await prisma.importedModel.update({
        where: { id },
        data: {
          name: parsed.data.name,
          categoryId: parsed.data.categoryId ?? null,
          fileId: parsed.data.fileId,
          thumbnailFileId: parsed.data.thumbnailFileId ?? null,
          width: parsed.data.width ?? null,
          depth: parsed.data.depth ?? null,
          height: parsed.data.height ?? null,
          configJson: JSON.stringify(parsed.data.config),
        },
        include: { category: true },
      })
      reply.send(formatImportedModel(row))
    } catch (err) {
      if (isPrismaError(err, 'P2025')) {
        sendError(reply, 404, '导入模型不存在')
        return
      }
      throw err
    }
  })

  app.delete('/api/3d/imported-models/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, 'invalid id')
      return
    }
    try {
      await prisma.importedModel.delete({ where: { id } })
      reply.send({ ok: true })
    } catch (err) {
      if (isPrismaError(err, 'P2025')) {
        sendError(reply, 404, '导入模型不存在')
        return
      }
      throw err
    }
  })
}
```

- [ ] **Step 4: 注册导入模型路由**

`packages/server/src/threeD/registerThreeDRoutes.ts` 改为：

```ts
import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { registerCategoryRoutes } from './categories.js'
import { registerFileRoutes } from './files.js'
import { registerSystemModelRoutes } from './systemModels.js'
import { registerImportedModelRoutes } from './importedModels.js'

export function registerThreeDRoutes(app: FastifyInstance, prisma: PrismaClient) {
  registerCategoryRoutes(app, prisma)
  registerFileRoutes(app, prisma)
  registerSystemModelRoutes(app, prisma)
  registerImportedModelRoutes(app, prisma)
}
```

- [ ] **Step 5: 运行测试确认通过**

```bash
pnpm -F @mvp-vue/server test test/importedModels.test.ts
```

Expected: PASS（2 个测试）。

- [ ] **Step 6: 提交**

```bash
cd /c/HOME/VUE/prj/mvp_vue
git add packages/server/src/threeD/importedModels.ts packages/server/src/threeD/registerThreeDRoutes.ts packages/server/test/importedModels.test.ts
git commit -m "feat: 增加 3D 导入模型接口"
```

---

### Task 9: 场景接口

**Files:**
- Create: `packages/server/src/threeD/scenes.ts`
- Modify: `packages/server/src/threeD/registerThreeDRoutes.ts`
- Create: `packages/server/test/scenes.test.ts`

- [ ] **Step 1: 写场景接口测试（先失败）**

`packages/server/test/scenes.test.ts`：

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestContext, type TestContext } from './helpers.js'

let ctx: TestContext

beforeEach(async () => {
  ctx = await createTestContext()
})

afterEach(async () => {
  await ctx.cleanup()
})

const scene = {
  version: 2,
  camera: { position: [0, 8, 12], target: [0, 0, 0], fov: 50 },
  environment: { background: '#0b1520', grid: true, gridSize: 1 },
  dataSources: [],
  colorDictionary: { status: {} },
  lights: [],
  modelLibrary: [],
  rooms: [],
  nodes: [],
}

describe('场景接口', () => {
  it('创建、列表、详情、更新与删除', async () => {
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/scenes',
      payload: { name: '住院病区', description: '示例', sceneJson: scene },
    })
    expect(created.statusCode).toBe(201)
    expect(created.json().scene.version).toBe(2)

    const list = await ctx.app.inject({ url: '/api/3d/scenes' })
    expect(list.json()).toHaveLength(1)
    expect(list.json()[0].scene).toBeUndefined()

    const id = created.json().id
    const detail = await ctx.app.inject({ url: `/api/3d/scenes/${id}` })
    expect(detail.json().scene.rooms).toEqual([])

    const updated = await ctx.app.inject({
      method: 'PUT',
      url: `/api/3d/scenes/${id}`,
      payload: { name: '住院病区（改）', sceneJson: JSON.stringify(scene) },
    })
    expect(updated.statusCode).toBe(200)
    expect(updated.json().name).toBe('住院病区（改）')

    const deleted = await ctx.app.inject({ method: 'DELETE', url: `/api/3d/scenes/${id}` })
    expect(deleted.statusCode).toBe(200)
  })

  it('拒绝不合法的 sceneJson', async () => {
    const noVersion = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/scenes',
      payload: { name: '坏场景', sceneJson: { rooms: [], nodes: [], modelLibrary: [] } },
    })
    expect(noVersion.statusCode).toBe(400)
    expect(noVersion.json().field).toBe('sceneJson.version')

    const badJson = await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/scenes',
      payload: { name: '坏场景', sceneJson: '{not json' },
    })
    expect(badJson.statusCode).toBe(400)
    expect(badJson.json().field).toBe('sceneJson')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm -F @mvp-vue/server test test/scenes.test.ts
```

Expected: FAIL，404。

- [ ] **Step 3: 创建 scenes.ts**

`packages/server/src/threeD/scenes.ts`：

```ts
import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import {
  normalizeSceneJson,
  sceneMetaSchema,
  zodError,
} from './validation.js'
import { formatSceneMeta } from './mappers.js'
import { isPrismaError, parseId, sendError } from './http.js'
import { thumbnailRefError } from './refs.js'

export function registerSceneRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get('/api/3d/scenes', async (_req, reply) => {
    const rows = await prisma.scene.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        thumbnailFileId: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    reply.send(rows.map(formatSceneMeta))
  })

  app.get('/api/3d/scenes/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, 'invalid id')
      return
    }
    const row = await prisma.scene.findUnique({ where: { id } })
    if (!row) {
      sendError(reply, 404, '场景不存在')
      return
    }
    let scene: unknown
    try {
      scene = JSON.parse(row.sceneJson)
    } catch {
      sendError(reply, 500, '场景 JSON 已损坏')
      return
    }
    reply.send({ ...formatSceneMeta(row), scene })
  })

  app.post('/api/3d/scenes', async (req, reply) => {
    const body = req.body as Record<string, unknown>
    const meta = sceneMetaSchema.safeParse(body)
    if (!meta.success) {
      const error = zodError(meta.error)
      sendError(reply, 400, error.message, error.field)
      return
    }
    const normalized = normalizeSceneJson(body.sceneJson)
    if (!normalized.ok) {
      sendError(reply, 400, normalized.error, normalized.field)
      return
    }
    const thumbnailError = await thumbnailRefError(prisma, meta.data.thumbnailFileId)
    if (thumbnailError) {
      sendError(reply, 400, thumbnailError, 'thumbnailFileId')
      return
    }
    const row = await prisma.scene.create({
      data: {
        name: meta.data.name,
        description: meta.data.description ?? null,
        thumbnailFileId: meta.data.thumbnailFileId ?? null,
        sceneJson: normalized.value,
      },
    })
    reply.status(201).send({ ...formatSceneMeta(row), scene: JSON.parse(row.sceneJson) })
  })

  app.put('/api/3d/scenes/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, 'invalid id')
      return
    }
    const body = req.body as Record<string, unknown>
    const meta = sceneMetaSchema.safeParse(body)
    if (!meta.success) {
      const error = zodError(meta.error)
      sendError(reply, 400, error.message, error.field)
      return
    }
    const normalized = normalizeSceneJson(body.sceneJson)
    if (!normalized.ok) {
      sendError(reply, 400, normalized.error, normalized.field)
      return
    }
    const thumbnailError = await thumbnailRefError(prisma, meta.data.thumbnailFileId)
    if (thumbnailError) {
      sendError(reply, 400, thumbnailError, 'thumbnailFileId')
      return
    }
    try {
      const row = await prisma.scene.update({
        where: { id },
        data: {
          name: meta.data.name,
          description: meta.data.description ?? null,
          thumbnailFileId: meta.data.thumbnailFileId ?? null,
          sceneJson: normalized.value,
        },
      })
      reply.send({ ...formatSceneMeta(row), scene: JSON.parse(row.sceneJson) })
    } catch (err) {
      if (isPrismaError(err, 'P2025')) {
        sendError(reply, 404, '场景不存在')
        return
      }
      throw err
    }
  })

  app.delete('/api/3d/scenes/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id)
    if (id == null) {
      sendError(reply, 400, 'invalid id')
      return
    }
    try {
      await prisma.scene.delete({ where: { id } })
      reply.send({ ok: true })
    } catch (err) {
      if (isPrismaError(err, 'P2025')) {
        sendError(reply, 404, '场景不存在')
        return
      }
      throw err
    }
  })
}
```

- [ ] **Step 4: 注册场景路由**

`packages/server/src/threeD/registerThreeDRoutes.ts` 改为：

```ts
import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { registerCategoryRoutes } from './categories.js'
import { registerFileRoutes } from './files.js'
import { registerSystemModelRoutes } from './systemModels.js'
import { registerImportedModelRoutes } from './importedModels.js'
import { registerSceneRoutes } from './scenes.js'

export function registerThreeDRoutes(app: FastifyInstance, prisma: PrismaClient) {
  registerCategoryRoutes(app, prisma)
  registerFileRoutes(app, prisma)
  registerSystemModelRoutes(app, prisma)
  registerImportedModelRoutes(app, prisma)
  registerSceneRoutes(app, prisma)
}
```

- [ ] **Step 5: 运行测试确认通过**

```bash
pnpm -F @mvp-vue/server test test/scenes.test.ts
```

Expected: PASS（2 个测试）。

- [ ] **Step 6: 提交**

```bash
cd /c/HOME/VUE/prj/mvp_vue
git add packages/server/src/threeD/scenes.ts packages/server/src/threeD/registerThreeDRoutes.ts packages/server/test/scenes.test.ts
git commit -m "feat: 增加 3D 场景接口"
```

---

### Task 10: 运行时模型库接口

**Files:**
- Create: `packages/server/src/threeD/modelLibrary.ts`
- Modify: `packages/server/src/threeD/registerThreeDRoutes.ts`
- Create: `packages/server/test/modelLibrary.test.ts`

- [ ] **Step 1: 写模型库接口测试（先失败）**

`packages/server/test/modelLibrary.test.ts`：

```ts
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

describe('运行时模型库', () => {
  it('输出房间、设备与导入模型', async () => {
    await ctx.app.inject({
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

    const uploaded = await uploadGlb(ctx, 'bed.glb', 'library-bed')
    await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/system-models',
      payload: {
        key: 'device-bed',
        name: '病床',
        kind: 'device',
        fileId: uploaded.json().id,
        config: { deviceKind: 'bed', tagPrefix: 'BED', initialStatus: 'standby' },
      },
    })

    await ctx.app.inject({
      method: 'POST',
      url: '/api/3d/imported-models',
      payload: {
        name: '呼吸机',
        fileId: uploaded.json().id,
        width: 0.8,
        depth: 0.6,
        config: { scale: 1 },
      },
    })

    const res = await ctx.app.inject({ url: '/api/3d/model-library' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.system).toHaveLength(2)
    expect(body.imported).toHaveLength(1)

    const room = body.system.find((entry: { id: string }) => entry.id === 'room-ward')
    expect(room.category).toBe('room')
    expect(room.label).toBe('病房')
    expect(room.render).toBe('shell')
    expect(room.footprint).toEqual([4.2, 5])

    const bed = body.system.find((entry: { id: string }) => entry.id === 'device-bed')
    expect(bed.url).toBe(`/api/3d/files/${uploaded.json().id}`)
    expect(bed.kind).toBe('bed')

    expect(body.imported[0].source).toBe('imported')
    expect(body.imported[0].id).toMatch(/^imported-\d+$/)
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
    expect(res.json().system).toHaveLength(0)
    expect(res.headers['x-skipped-models']).toBe('device-no-file')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm -F @mvp-vue/server test test/modelLibrary.test.ts
```

Expected: FAIL，404。

- [ ] **Step 3: 创建 modelLibrary.ts**

`packages/server/src/threeD/modelLibrary.ts`：

```ts
import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import {
  importedModelToLibraryEntry,
  systemModelToLibraryEntry,
} from './mappers.js'

export function registerModelLibraryRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get('/api/3d/model-library', async (_req, reply) => {
    const [systemRows, importedRows] = await Promise.all([
      prisma.systemModel.findMany({ orderBy: [{ kind: 'asc' }, { id: 'asc' }] }),
      prisma.importedModel.findMany({ orderBy: { id: 'asc' } }),
    ])

    const system: Array<Record<string, unknown>> = []
    const skipped: string[] = []
    for (const row of systemRows) {
      const mapped = systemModelToLibraryEntry(row)
      if (mapped.entry) system.push(mapped.entry)
      else if (mapped.skipped) skipped.push(row.key)
    }

    if (skipped.length > 0) {
      reply.header('X-Skipped-Models', skipped.join(','))
    }
    reply.send({
      system,
      imported: importedRows.map(importedModelToLibraryEntry),
    })
  })
}
```

- [ ] **Step 4: 注册模型库路由**

`packages/server/src/threeD/registerThreeDRoutes.ts` 改为：

```ts
import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { registerCategoryRoutes } from './categories.js'
import { registerFileRoutes } from './files.js'
import { registerSystemModelRoutes } from './systemModels.js'
import { registerImportedModelRoutes } from './importedModels.js'
import { registerSceneRoutes } from './scenes.js'
import { registerModelLibraryRoutes } from './modelLibrary.js'

export function registerThreeDRoutes(app: FastifyInstance, prisma: PrismaClient) {
  registerCategoryRoutes(app, prisma)
  registerFileRoutes(app, prisma)
  registerSystemModelRoutes(app, prisma)
  registerImportedModelRoutes(app, prisma)
  registerSceneRoutes(app, prisma)
  registerModelLibraryRoutes(app, prisma)
}
```

- [ ] **Step 5: 运行测试确认通过**

```bash
pnpm -F @mvp-vue/server test test/modelLibrary.test.ts
```

Expected: PASS（2 个测试）。

- [ ] **Step 6: 提交**

```bash
cd /c/HOME/VUE/prj/mvp_vue
git add packages/server/src/threeD/modelLibrary.ts packages/server/src/threeD/registerThreeDRoutes.ts packages/server/test/modelLibrary.test.ts
git commit -m "feat: 增加 3D 模型库接口"
```

---

### Task 11: Seed 脚本与存量资源

**Files:**
- Create: `packages/server/prisma/seed-assets/catalog.json`
- Create: `packages/server/prisma/seed-assets/scenes/hospital-ward.json`
- Create: `packages/server/prisma/seed-assets/models/*.glb`
- Create: `packages/server/prisma/seed3d.ts`

- [ ] **Step 1: 复制存量资源**

```bash
cd /c/HOME/VUE/prj/mvp_vue
mkdir -p packages/server/prisma/seed-assets/models packages/server/prisma/seed-assets/scenes
cp /c/HOME/REACT/prj/3ddemo/public/models/catalog.json packages/server/prisma/seed-assets/catalog.json
cp /c/HOME/REACT/prj/3ddemo/public/scenes/hospital-ward.json packages/server/prisma/seed-assets/scenes/hospital-ward.json
cp /c/HOME/REACT/prj/3ddemo/public/models/devices/*.glb packages/server/prisma/seed-assets/models/
```

Expected: `seed-assets/models` 下有 8 个 GLB。

- [ ] **Step 2: 创建 seed 脚本**

`packages/server/prisma/seed3d.ts`：

```ts
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import { ensureDatabaseSchema } from '../src/ensureDatabaseSchema.js'
import { deviceConfigSchema, roomConfigSchema } from '../src/threeD/validation.js'

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db'
}

interface CatalogEntry {
  id: string
  label: string
  category: 'room' | 'device'
  render?: 'glb' | 'floor' | 'shell'
  footprint?: [number, number]
  height?: number
  defaultKind?: 'room' | 'corridor'
  url?: string
  kind?: 'rack' | 'ahu' | 'imaging' | 'monitor' | 'gas' | 'bed' | 'bedside' | 'callhost'
  tagPrefix?: string
  initialStatus?: 'normal' | 'warning' | 'alarm' | 'standby' | 'calling' | 'emergency'
  metrics?: Array<{ label: string; value: string }>
  labelOffset?: [number, number, number]
  lampOffset?: [number, number, number]
  screen?: {
    renderer: 'bedside' | 'callhost'
    position: [number, number, number]
    size: [number, number]
  }
  statusStrip?: {
    position: [number, number, number]
    size: [number, number]
  }
  states?: unknown[]
}

const here = dirname(fileURLToPath(import.meta.url))
const assetsDir = join(here, 'seed-assets')
const force = process.argv.includes('--force')
const prisma = new PrismaClient()

async function main() {
  await ensureDatabaseSchema(prisma)

  const [modelCount, sceneCount] = await Promise.all([
    prisma.systemModel.count(),
    prisma.scene.count(),
  ])
  if (!force && (modelCount > 0 || sceneCount > 0)) {
    console.log('3D 数据已存在，跳过 seed。使用 --force 更新。')
    return
  }

  const categoryIds = new Map<string, number>()
  for (const name of ['房间', '设备']) {
    const row = await prisma.modelCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    })
    categoryIds.set(name, row.id)
  }

  const catalog = JSON.parse(
    readFileSync(join(assetsDir, 'catalog.json'), 'utf8'),
  ) as CatalogEntry[]

  const fileIdByUrl = new Map<string, number>()
  for (const entry of catalog) {
    if (!entry.url) continue
    const fileName = entry.url.split('/').pop()
    if (!fileName) throw new Error(`${entry.id} 的 url 无法解析文件名`)
    const bytes = readFileSync(join(assetsDir, 'models', fileName))
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    const existing = await prisma.assetFile.findUnique({ where: { sha256 } })
    const file =
      existing ??
      (await prisma.assetFile.create({
        data: {
          name: fileName,
          mime: 'model/gltf-binary',
          size: bytes.length,
          sha256,
          data: bytes,
        },
      }))
    fileIdByUrl.set(entry.url, file.id)
  }

  let modelTotal = 0
  for (const entry of catalog) {
    const isRoom = entry.category === 'room'
    const rawConfig = isRoom
      ? {
          render: entry.render ?? 'shell',
          defaultKind: entry.defaultKind ?? 'room',
          ...(entry.id === 'room-ward' ? { bedLayout: { count: 4 } } : {}),
        }
      : {
          deviceKind: entry.kind,
          tagPrefix: entry.tagPrefix ?? 'DEV',
          initialStatus: entry.initialStatus ?? 'normal',
          metrics: entry.metrics ?? [],
          ...(entry.labelOffset ? { labelOffset: entry.labelOffset } : {}),
          ...(entry.lampOffset ? { lampOffset: entry.lampOffset } : {}),
          ...(entry.screen ? { screen: entry.screen } : {}),
          ...(entry.statusStrip ? { statusStrip: entry.statusStrip } : {}),
          ...(entry.states ? { states: entry.states } : {}),
          ...(entry.footprint ? { footprint: entry.footprint } : {}),
        }

    if (!isRoom && !entry.kind) {
      throw new Error(`${entry.id} 缺少 kind`)
    }

    const config = isRoom
      ? roomConfigSchema.parse(rawConfig)
      : deviceConfigSchema.parse(rawConfig)

    const data = {
      key: entry.id,
      name: entry.label,
      categoryId: categoryIds.get(isRoom ? '房间' : '设备') ?? null,
      kind: isRoom ? 'room' : 'device',
      width: entry.footprint?.[0] ?? null,
      depth: entry.footprint?.[1] ?? null,
      height: entry.height ?? null,
      fileId: entry.url ? (fileIdByUrl.get(entry.url) ?? null) : null,
      configJson: JSON.stringify(config),
    }

    await prisma.systemModel.upsert({
      where: { key: entry.id },
      update: data,
      create: data,
    })
    modelTotal += 1
  }

  const sceneJson = readFileSync(
    join(assetsDir, 'scenes', 'hospital-ward.json'),
    'utf8',
  )
  const sceneName = '住院病区示例'
  const existingScene = await prisma.scene.findFirst({ where: { name: sceneName } })
  if (existingScene) {
    await prisma.scene.update({
      where: { id: existingScene.id },
      data: { sceneJson },
    })
  } else {
    await prisma.scene.create({
      data: {
        name: sceneName,
        description: '由 3ddemo 医院病区场景导入',
        sceneJson,
      },
    })
  }

  console.log(
    `seed 完成：分类 2，系统模型 ${modelTotal}，文件 ${fileIdByUrl.size}，场景 1`,
  )
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
```

- [ ] **Step 3: 用临时库验证 seed**

```bash
cd /c/HOME/VUE/prj/mvp_vue/packages/server
rm -f prisma/test-seed.db prisma/test-seed.db-journal
DATABASE_URL='file:./test-seed.db' pnpm exec tsx prisma/seed3d.ts
```

Expected 输出：`seed 完成：分类 2，系统模型 10，文件 8，场景 1`。

- [ ] **Step 4: 再跑一次验证幂等**

```bash
cd /c/HOME/VUE/prj/mvp_vue/packages/server
DATABASE_URL='file:./test-seed.db' pnpm exec tsx prisma/seed3d.ts
```

Expected 输出：`3D 数据已存在，跳过 seed。使用 --force 更新。`

- [ ] **Step 5: 清理临时库**

```bash
cd /c/HOME/VUE/prj/mvp_vue/packages/server
rm -f prisma/test-seed.db prisma/test-seed.db-journal prisma/test-seed.db-wal prisma/test-seed.db-shm
```

- [ ] **Step 6: 提交**

```bash
cd /c/HOME/VUE/prj/mvp_vue
git add packages/server/prisma/seed3d.ts packages/server/prisma/seed-assets
git commit -m "feat: 增加 3D 数据种子脚本"
```

---

### Task 12: 全量验证与收尾

**Files:**
- 无新增

- [ ] **Step 1: 重新生成 Prisma Client**

```bash
pnpm -F @mvp-vue/server exec prisma generate
```

Expected: 无错误。

- [ ] **Step 2: 运行全部测试**

```bash
pnpm -F @mvp-vue/server test
```

Expected: 所有测试通过（app、schema、validation、categories、files、systemModels、importedModels、scenes、modelLibrary）。

- [ ] **Step 3: 构建服务端**

```bash
pnpm -F @mvp-vue/server build
```

Expected: 无 TS 错误，`dist/` 生成。

- [ ] **Step 4: 检查工作区**

```bash
cd /c/HOME/VUE/prj/mvp_vue
git status --short
```

Expected: 只包含本计划涉及的文件；`prisma/*.db` 与 `*.db` 已被 `.gitignore` 忽略。

- [ ] **Step 5: 最终提交（如有遗漏）**

```bash
git add packages/server/src packages/server/test packages/server/prisma packages/server/vitest.config.ts packages/server/package.json pnpm-lock.yaml
git commit -m "test: 完成 3D 服务验收"
```

Expected: 若无遗漏则显示 `nothing to commit`，无需强行提交。

---

## 验收检查表

- [ ] 服务端启动后自动创建 5 张 3D 表，重复启动不重复执行。
- [ ] 分类可增删改；重名 `409`；被引用删除 `409`。
- [ ] GLB 上传返回 `201`，重复上传返回 `200` 且 `deduplicated: true`；下载内容与上传一致。
- [ ] 系统模型可创建房间/设备模板，非法配置返回 `400` 且带字段路径。
- [ ] 导入模型必须引用 GLB 文件。
- [ ] 场景创建/更新/读取/删除正常；非法 `sceneJson` 返回 `400`。
- [ ] `GET /api/3d/model-library` 的 `system` 与 3ddemo `ModelEntry` 结构一致。
- [ ] seed 后得到 2 个分类、10 个系统模型、8 个文件、1 个场景。

## 与设计的偏差说明

- 设计文档写的是“抽出 `buildApp` 到 `src/app.ts`”，本计划同时把原 `index.ts` 里的演示路由与自定义图标路由拆到独立文件，避免 `app.ts` 变成新的巨型文件。接口与行为保持不变。
- 设计文档中的 `buildApp` 签名在计划中增加了可选 `options.logger`，用于测试关闭日志，不影响生产调用。
