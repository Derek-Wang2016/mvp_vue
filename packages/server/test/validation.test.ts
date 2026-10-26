import { describe, expect, it } from 'vitest'
import {
  deviceConfigSchema,
  importedModelInputSchema,
  normalizeSceneJson,
  roomConfigSchema,
  systemModelInputSchema,
  zodError,
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

  it('保留未知的顶层字段', () => {
    const parsed = roomConfigSchema.parse({ futureKey: 1 })
    expect((parsed as Record<string, unknown>).futureKey).toBe(1)
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

  it('拒绝非法的初始状态', () => {
    const res = deviceConfigSchema.safeParse({
      deviceKind: 'monitor',
      tagPrefix: 'MON',
      initialStatus: 'broken',
    })
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

  it('拒绝 Infinity 尺寸', () => {
    const room = systemModelInputSchema.safeParse({
      key: 'room-x',
      name: 'X',
      kind: 'room',
      width: Infinity,
      depth: 5,
      height: 2.8,
      config: {},
    })
    expect(room.success).toBe(false)
    expect(
      normalizeSceneJson(JSON.parse('{"version":1e999,"rooms":[],"nodes":[],"modelLibrary":[]}')).ok,
    ).toBe(false)
  })

  it('拒绝超出 32 位整数的 fileId', () => {
    const res = systemModelInputSchema.safeParse({
      key: 'device-x',
      name: 'X',
      kind: 'device',
      fileId: 1e300,
      config: { deviceKind: 'bed', tagPrefix: 'BED' },
    })
    expect(res.success).toBe(false)
    if (res.success) return
    expect(zodError(res.error).field).toBe('fileId')
  })

  it('zodError 保留请求字段名 config', () => {
    const res = systemModelInputSchema.safeParse({
      key: 'room-x',
      name: 'X',
      kind: 'room',
      width: 4,
      depth: 5,
      height: 2.8,
      config: { bedLayout: { count: 0 } },
    })
    expect(res.success).toBe(false)
    if (res.success) return
    expect(zodError(res.error).field).toBe('config.bedLayout.count')
  })
})

describe('importedModelInputSchema', () => {
  it('拒绝超出 32 位整数的 fileId', () => {
    const res = importedModelInputSchema.safeParse({ name: '呼吸机', fileId: 1e300 })
    expect(res.success).toBe(false)
    if (res.success) return
    expect(zodError(res.error).field).toBe('fileId')
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

  it('拒绝非法 JSON 字符串并给出 sceneJson 字段', () => {
    const res = normalizeSceneJson('{bad')
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.field).toBe('sceneJson')
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

  it('设备模板在缺少尺寸时使用配置 footprint 与默认偏移', () => {
    const row = {
      ...base,
      id: 3,
      key: 'device-monitor',
      name: '监护仪',
      kind: 'device',
      width: null,
      depth: null,
      height: null,
      fileId: 10,
      configJson: JSON.stringify({
        deviceKind: 'monitor',
        tagPrefix: 'MON',
        footprint: [0.5, 0.4],
      }),
    }
    const { entry, skipped } = systemModelToLibraryEntry(row)
    expect(skipped).toBe(false)
    expect(entry?.labelOffset).toEqual([0, 2, 0])
    expect(entry?.lampOffset).toEqual([0, 1.5, 0])
    expect(entry?.footprint).toEqual([0.5, 0.4])
  })

  it('脏数据行返回跳过标记', () => {
    const deviceNoFile = {
      ...base,
      id: 4,
      key: 'device-x',
      name: 'X',
      kind: 'device',
      width: null,
      depth: null,
      height: null,
      fileId: null,
      configJson: JSON.stringify({ deviceKind: 'bed', tagPrefix: 'BED' }),
    }
    expect(systemModelToLibraryEntry(deviceNoFile)).toEqual({ entry: null, skipped: true })

    const deviceBadConfig = { ...deviceNoFile, id: 5, key: 'device-y', fileId: 5, configJson: '{}' }
    expect(systemModelToLibraryEntry(deviceBadConfig)).toEqual({ entry: null, skipped: true })

    const roomNoSize = {
      ...base,
      id: 6,
      key: 'room-x',
      name: 'X',
      kind: 'room',
      width: null,
      depth: 5,
      height: 2.8,
      fileId: null,
      configJson: '{}',
    }
    expect(systemModelToLibraryEntry(roomNoSize)).toEqual({ entry: null, skipped: true })

    const deviceBadJson = { ...deviceNoFile, id: 7, key: 'device-z', fileId: 5, configJson: '{bad' }
    expect(systemModelToLibraryEntry(deviceBadJson)).toEqual({ entry: null, skipped: true })
  })

  it('GLB 房间模板输出文件 url', () => {
    const row = {
      ...base,
      id: 8,
      key: 'room-glb',
      name: 'GLB 病房',
      kind: 'room',
      width: 4.2,
      depth: 5,
      height: 2.8,
      fileId: 12,
      configJson: JSON.stringify({ render: 'glb' }),
    }
    const { entry } = systemModelToLibraryEntry(row)
    expect(entry?.url).toBe('/api/3d/files/12')
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
    const { entry, skipped } = importedModelToLibraryEntry(row)
    expect(skipped).toBe(false)
    expect(entry?.id).toBe('imported-7')
    expect(entry?.source).toBe('imported')
    expect(entry?.url).toBe('/api/3d/files/11')
    expect(entry?.config).toEqual({ scale: 1 })
  })

  it('导入模型脏配置返回跳过标记', () => {
    const baseRow = {
      ...base,
      id: 8,
      name: '坏模型',
      fileId: 12,
      width: null,
      depth: null,
      height: null,
    }
    expect(importedModelToLibraryEntry({ ...baseRow, configJson: '{bad' })).toEqual({
      entry: null,
      skipped: true,
    })
    expect(
      importedModelToLibraryEntry({ ...baseRow, configJson: JSON.stringify({ scale: -1 }) }),
    ).toEqual({ entry: null, skipped: true })
  })
})
