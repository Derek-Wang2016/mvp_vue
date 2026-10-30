import { describe, expect, it, vi } from 'vitest'

interface PoolItem {
  bedId: number
  roomId: number
  bedNo: string
  bedName: string
  wardroomNum: string
  wardroomName: string
  patientName: string | null
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

  it('床位数量不变，且每个床位的房间与床号唯一', async () => {
    const pool = await loadPool()
    expect(pool).toHaveLength(47)

    const keys = pool.map((item) => `${item.roomId}:${item.bedNo}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('有患者的床位仍返回患者信息', async () => {
    const pool = await loadPool()
    const occupied = pool.filter((item) => item.patientName != null)
    expect(occupied.length).toBeGreaterThan(0)
    for (const item of occupied) {
      expect(item.patientName).not.toBe('')
    }
  })

  it('部分床位房号床号正常但患者信息为空', async () => {
    const pool = await loadPool()
    const empty = pool.filter((item) => item.patientName == null)

    expect(empty.length).toBe(4)
    for (const item of empty) {
      expect(item.bedNo).not.toBe('')
      expect(item.wardroomName).not.toBe('')
      expect(item.bedName).toBe(`${item.bedNo}床`)
    }
    expect(pool.slice(0, 10).some((item) => item.patientName == null)).toBe(true)
  })
})
