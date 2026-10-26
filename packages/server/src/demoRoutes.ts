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
