import Fastify from 'fastify'
import cors from '@fastify/cors'
import { PrismaClient } from '@prisma/client'
import {
  buildCountryMapStats,
  buildProvinceMapStats,
  parseMapStatsQuery,
  resolveProvinceOption,
  cacheMapGeoJson,
} from './mapStatsDemo.js'
import { buildCardListResponse } from './cardListDemo.js'
import { buildWardKvSingleResponse, buildWardKvMultiResponse } from './wardKvStatsDemo.js'
import {
  createCustomIcon,
  deleteCustomIcon,
  getCustomIconById,
  listCustomIcons,
  updateCustomIcon,
  validateCustomIconInput,
} from './customIcons.js'
import { isStrictPagePolicy } from './pageScopePolicy.js'
import { registerDraftPageRoutes } from './routes/draftPages.js'
import { registerPublishPageRoutes } from './routes/publishPages.js'

const app = Fastify({ logger: true })
await app.register(cors, { origin: true })
const prisma = new PrismaClient()

registerDraftPageRoutes(app, prisma)
registerPublishPageRoutes(app, prisma)

if (isStrictPagePolicy()) {
  console.log('PAGE_POLICY=strict：发布模式，调试表只读')
}

// ===== 自定义 SVG 图标库（与 Tabler 预设库分离，跨页面复用）=====

/** GET /api/custom-icons — 列表；?includeSvg=1 含 svgContent */
app.get('/api/custom-icons', async (req, reply) => {
  const query = req.query as { includeSvg?: string }
  const includeSvg = query.includeSvg === '1' || query.includeSvg === 'true'
  const items = await listCustomIcons(prisma, { includeSvg })
  reply.send(items)
})

/** GET /api/custom-icons/:id — 单条（含 svgContent） */
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

/** POST /api/custom-icons — 创建 */
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

/** PUT /api/custom-icons/:id — 更新（name / svgContent 可选） */
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

/** DELETE /api/custom-icons/:id */
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

// 数据代理 —— 转发第三方 API 请求，注入鉴权，提取数据路径
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

    // JSONPath 提取
    if (dataPath) {
      body = extractByPath(body, dataPath)
    }

    reply.send({ data: body })
  } catch (err: any) {
    reply.status(502).send({ error: err.message })
  }
})

// 简单 JSONPath 提取：$.data.items → obj.data.items
function extractByPath(obj: unknown, path: string): unknown {
  // 去掉开头的 $
  const clean = path.startsWith('$') ? path.slice(1) : path
  // 去掉开头的点
  const trimmed = clean.replace(/^\./, '')
  // 空路径（只有 $）返回整个对象
  if (!trimmed) return obj
  const segments = trimmed.split('.')
  let current: any = obj
  for (const seg of segments) {
    if (current == null) return null
    current = current[seg]
  }
  return current
}

// SQL 查询
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

// 省级地图 GeoJSON 代理（避免浏览器直连 DataV 触发 CORS）
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

/**
 * 地图 REST 测试数据（名称与 DataV / 地图组件一致，数值每次随机）
 *
 * GET /api/demo/map-stats?level=country
 * GET /api/demo/map-stats?level=province&province=陕西省
 * GET /api/demo/map-stats?level=province&adcode=610000
 * 可选：min=50&max=500 控制随机值区间
 *
 * 编辑器数据源：类型 REST，URL 填上表，数据路径填 data（或 $.data）
 */
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

/**
 * 卡片列表 REST 测试数据（与第三方病区床位接口同形）
 *
 * GET /api/demo/card-list?pageNo=1&pageSize=10
 * 可选 wardId=5（与 fixedParams 一致，过滤病区）
 *
 * 编辑器 card-list：API URL 填 http://localhost:3002/api/demo/card-list
 * 列表路径 data.list、总数路径 data.total（默认即可）
 */
app.get('/api/demo/card-list', async (req, reply) => {
  const result = buildCardListResponse(req.query as Record<string, unknown>)
  if ('error' in result) {
    reply.status(result.status).send({ error: result.error })
    return
  }
  reply.send(result)
})

/**
 * 病区统计 KEY-VALUE（单数字 VALUE）
 *
 * GET /api/demo/ward-kv-single
 * 响应 data: [{ KEY, VALUE }]，VALUE 为单个数字字符串
 * 页面 REST 数据源：数据路径填 data
 */
app.get('/api/demo/ward-kv-single', async (_req, reply) => {
  reply.send(buildWardKvSingleResponse())
})

/**
 * 病区统计 KEY-VALUE（多数字 VALUE，逗号分隔，每项 1～30 个数字）
 *
 * GET /api/demo/ward-kv-multi
 * 响应 data: [{ KEY, VALUE }]，VALUE 如 "3,12,5,28"
 */
app.get('/api/demo/ward-kv-multi', async (_req, reply) => {
  reply.send(buildWardKvMultiResponse())
})

/** @deprecated 请用 /api/demo/map-stats?level=country；保留兼容旧页面 */
app.get('/api/demo/live-data', async (_req, reply) => {
  const { data } = buildCountryMapStats(80, 520)
  reply.send({ data })
})

try {
  await app.listen({ port: 3002, host: '0.0.0.0' })
  console.log('Server running at http://0.0.0.0:3002')
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
