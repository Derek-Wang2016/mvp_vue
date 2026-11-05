import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import { ensureDatabaseSchema } from '../src/ensureDatabaseSchema.js'
import {
  deviceConfigSchema,
  normalizeSceneJson,
  roomConfigSchema,
} from '../src/threeD/validation.js'

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
  kind?:
    | 'rack'
    | 'ahu'
    | 'imaging'
    | 'monitor'
    | 'gas'
    | 'bed'
    | 'bedside'
    | 'callhost'
  tagPrefix?: string
  initialStatus?:
    | 'normal'
    | 'warning'
    | 'alarm'
    | 'standby'
    | 'calling'
    | 'emergency'
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

interface PreparedAsset {
  url: string
  fileName: string
  bytes: Buffer
  sha256: string
}

interface PreparedModel {
  entry: CatalogEntry
  isRoom: boolean
  configJson: string
}

const here = dirname(fileURLToPath(import.meta.url))
const assetsDir = join(here, 'seed-assets')
const force = process.argv.includes('--force')
const prisma = new PrismaClient()

/**
 * 事务外完成资源读取与配置校验，缩短事务窗口；
 * 事务内只做数据库写入，失败时整体回滚。
 */
function prepareCatalog(catalog: CatalogEntry[]): {
  assets: PreparedAsset[]
  models: PreparedModel[]
} {
  const assets: PreparedAsset[] = []
  const models: PreparedModel[] = []

  for (const entry of catalog) {
    if (entry.category !== 'room' && entry.category !== 'device') {
      throw new Error(
        `${entry.id} 的 category 必须是 room 或 device（当前：${String(entry.category)}）`,
      )
    }
    if (entry.category === 'device' && !entry.url) {
      throw new Error(`${entry.id} 是设备，必须提供 url`)
    }

    if (entry.url) {
      const fileName = entry.url.split(/[\\/]/).pop()
      if (!fileName) throw new Error(`${entry.id} 的 url 无法解析文件名`)
      let bytes: Buffer
      try {
        bytes = readFileSync(join(assetsDir, 'models', fileName))
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err)
        throw new Error(`${entry.id} 读取模型文件 ${fileName} 失败：${reason}`)
      }
      const sha256 = createHash('sha256').update(bytes).digest('hex')
      assets.push({ url: entry.url, fileName, bytes, sha256 })
    }

    const isRoom = entry.category === 'room'
    if (!isRoom && !entry.kind) {
      throw new Error(`${entry.id} 缺少 kind`)
    }
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

    const config = isRoom
      ? roomConfigSchema.parse(rawConfig)
      : deviceConfigSchema.parse(rawConfig)

    models.push({ entry, isRoom, configJson: JSON.stringify(config) })
  }

  return { assets, models }
}

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

  const catalog = JSON.parse(
    readFileSync(join(assetsDir, 'catalog.json'), 'utf8'),
  ) as CatalogEntry[]

  const { assets, models } = prepareCatalog(catalog)

  const sceneRaw = readFileSync(
    join(assetsDir, 'scenes', 'hospital-ward.json'),
    'utf8',
  )
  const normalized = normalizeSceneJson(sceneRaw)
  if (!normalized.ok) {
    throw new Error(`场景校验失败：${normalized.error}（${normalized.field}）`)
  }
  const sceneJson = normalized.value

  const sceneName = '住院病区示例'
  const sceneDescription = '由 3ddemo 医院病区场景导入'

  const { modelTotal, fileCount } = await prisma.$transaction(
    async (tx) => {
      const categoryIds = new Map<string, number>()
      for (const name of ['房间', '设备']) {
        const row = await tx.modelCategory.upsert({
          where: { name },
          update: {},
          create: { name },
        })
        categoryIds.set(name, row.id)
      }

      const fileIdByUrl = new Map<string, number>()
      const fileIds = new Set<number>()
      for (const asset of assets) {
        const file = await tx.assetFile.upsert({
          where: { sha256: asset.sha256 },
          update: {},
          create: {
            name: asset.fileName,
            mime: 'model/gltf-binary',
            size: asset.bytes.length,
            sha256: asset.sha256,
            data: asset.bytes,
          },
        })
        fileIdByUrl.set(asset.url, file.id)
        fileIds.add(file.id)
      }

      let seededModels = 0
      for (const { entry, isRoom, configJson } of models) {
        const data = {
          key: entry.id,
          name: entry.label,
          categoryId: categoryIds.get(isRoom ? '房间' : '设备') ?? null,
          kind: isRoom ? 'room' : 'device',
          width: entry.footprint?.[0] ?? null,
          depth: entry.footprint?.[1] ?? null,
          height: entry.height ?? null,
          fileId: entry.url ? (fileIdByUrl.get(entry.url) ?? null) : null,
          configJson,
        }

        if (isRoom) {
          await tx.systemModel.upsert({
            where: { key: entry.id },
            update: data,
            create: data,
          })
        } else {
          const existing = await tx.deviceModel.findFirst({
            where: {
              name: entry.label,
              fileId: data.fileId!,
            },
          })
          if (existing) {
            await tx.deviceModel.update({
              where: { id: existing.id },
              data: {
                name: entry.label,
                categoryId: data.categoryId,
                width: data.width,
                depth: data.depth,
                height: data.height,
                configJson,
              },
            })
          } else {
            await tx.deviceModel.create({
              data: {
                name: entry.label,
                categoryId: data.categoryId,
                fileId: data.fileId!,
                width: data.width,
                depth: data.depth,
                height: data.height,
                configJson,
              },
            })
          }
        }
        seededModels += 1
      }

      const existingScene = await tx.scene.findFirst({
        where: { name: sceneName },
      })
      if (existingScene) {
        await tx.scene.update({
          where: { id: existingScene.id },
          data: { description: sceneDescription, sceneJson },
        })
      } else {
        await tx.scene.create({
          data: {
            name: sceneName,
            description: sceneDescription,
            sceneJson,
          },
        })
      }

      return { modelTotal: seededModels, fileCount: fileIds.size }
    },
    { timeout: 30_000 },
  )

  console.log(
    `seed 完成：分类 2，系统模型 ${modelTotal}，文件 ${fileCount}，场景 1`,
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
