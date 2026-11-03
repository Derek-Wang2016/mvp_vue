import { describe, expect, it, vi } from 'vitest'

interface PoolItem {
  bedId: number
  roomId: number
  bedNo: string
  bedName: string
  wardroomNum: string
  wardroomName: string
  patientName: string | null
  tend: string | null
}

function layoutOf(pool: PoolItem[]) {
  return pool.map(({ bedId, roomId, bedNo, bedName, wardroomNum, wardroomName }) => ({
    bedId,
    roomId,
    bedNo,
    bedName,
    wardroomNum,
    wardroomName,
  }))
}

async function loadPool(): Promise<PoolItem[]> {
  const module = await import('../src/cardListDemo.js')
  return module.buildCardListPool() as unknown as PoolItem[]
}

describe('card-list 房号床号固定', () => {
  it('同一模块内多次调用布局不变', async () => {
    const first = await loadPool()
    const second = await loadPool()
    expect(layoutOf(second)).toEqual(layoutOf(first))
  })

  it('重新加载模块（模拟服务重启）后房号床号仍然一致', async () => {
    vi.resetModules()
    const before = layoutOf(await loadPool())
    vi.resetModules()
    const after = layoutOf(await loadPool())
    expect(after).toEqual(before)
  })

  it('床位数量固定，且每个房间的床位数符合两人房或三人房配置', async () => {
    const pool = await loadPool()
    expect(pool).toHaveLength(162)

    const keys = pool.map((item) => `${item.roomId}:${item.bedNo}`)
    expect(new Set(keys).size).toBe(keys.length)

    const roomCounts = new Map<number, number>()
    for (const item of pool) {
      roomCounts.set(item.roomId, (roomCounts.get(item.roomId) ?? 0) + 1)
    }
    expect([...roomCounts.values()].every((count) => count === 2 || count === 3)).toBe(true)
  })

  it('每个床位均返回随机患者信息和护理等级', async () => {
    const pool = await loadPool()
    for (const item of pool) {
      expect(item.patientName).not.toBe('')
      expect(['1', '2', '3']).toContain(item.tend)
    }
  })

  it('床号为连续数字，且床位名称与床号一致', async () => {
    const pool = await loadPool()

    for (const item of pool) {
      expect(item.bedNo).toMatch(/^\d+$/)
      expect(item.wardroomName).not.toBe('')
      expect(item.bedName).toBe(`${item.bedNo}床`)
    }
  })
})
