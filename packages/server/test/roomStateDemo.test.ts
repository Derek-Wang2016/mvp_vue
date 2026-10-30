import { describe, expect, it } from 'vitest'
import {
  DOOR_LAMP_STATES,
  DOOR_STATES,
  ROOM_STATE_ROOMS,
  buildRoomStateResponse,
} from '../src/roomStateDemo.js'

describe('buildRoomStateResponse', () => {
  it('按房间数组返回门灯与门状态', () => {
    const response = buildRoomStateResponse()

    expect(response.code).toBe(0)
    expect(response.msg).toBe('')
    expect(response.data).toHaveLength(ROOM_STATE_ROOMS.length)
    expect(response.data.map((item) => item.roomName)).toContain('301 病房')
    for (const item of response.data) {
      expect(typeof item.roomName).toBe('string')
      expect(typeof item.doorLamp).toBe('string')
      expect(typeof item.door).toBe('string')
    }
  })

  it('房间名唯一，取值限定在约定枚举内', () => {
    const response = buildRoomStateResponse()
    const names = response.data.map((item) => item.roomName)

    expect(new Set(names).size).toBe(names.length)
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
