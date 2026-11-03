import { describe, expect, it } from 'vitest'
import { buildCardListRooms } from '../src/cardListDemo.js'
import { DOOR_LAMP_STATES, DOOR_STATES, buildRoomStateResponse } from '../src/roomStateDemo.js'

describe('buildRoomStateResponse', () => {
  it('返回与卡片列表一致的病房及门状态', () => {
    const response = buildRoomStateResponse()
    const cardListRooms = buildCardListRooms()

    expect(response.code).toBe(0)
    expect(response.msg).toBe('')
    expect(response.data).toHaveLength(cardListRooms.length)
    expect(response.data.map(({ roomId, roomNo, roomName }) => ({ roomId, roomNo, roomName })))
      .toEqual(cardListRooms.map(({ roomId, wardroomNum, wardroomName }) => ({
        roomId,
        roomNo: wardroomNum,
        roomName: wardroomName,
      })))
    for (const item of response.data) {
      expect(typeof item.roomId).toBe('number')
      expect(typeof item.roomNo).toBe('string')
      expect(typeof item.roomName).toBe('string')
      expect(typeof item.doorLamp).toBe('string')
      expect(typeof item.door).toBe('string')
    }
  })

  it('房间名唯一，取值限定在约定枚举内', () => {
    const response = buildRoomStateResponse()
    const roomIds = response.data.map((item) => item.roomId)

    expect(new Set(roomIds).size).toBe(roomIds.length)
    for (const item of response.data) {
      expect(DOOR_LAMP_STATES).toContain(item.doorLamp)
      expect(DOOR_STATES).toContain(item.door)
    }
  })

  it('四个门灯状态都能被随机生成', () => {
    const lamps = new Set<string>()
    for (let index = 0; index < 200; index += 1) {
      for (const item of buildRoomStateResponse().data) lamps.add(item.doorLamp)
    }
    expect([...lamps].sort()).toEqual([...DOOR_LAMP_STATES].sort())
  })

  it('注入随机源时结果可预测', () => {
    const first = buildRoomStateResponse(() => 0)
    const second = buildRoomStateResponse(() => 0)
    expect(first).toEqual(second)
    expect(first.data.every((item) => item.door === 'close')).toBe(true)
  })
})
