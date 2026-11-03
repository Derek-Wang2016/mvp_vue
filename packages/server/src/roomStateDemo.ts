import { buildCardListRooms } from './cardListDemo.js'

/** 门灯取值，与三色门灯模型状态组 doorLamp 的取值 id 一致 */
export const DOOR_LAMP_STATES = ['green', 'yellow', 'red', 'off'] as const
export type DoorLampState = (typeof DOOR_LAMP_STATES)[number]

/** 门扇取值 */
export const DOOR_STATES = ['open', 'close'] as const
export type DoorState = (typeof DOOR_STATES)[number]

export interface RoomState {
  roomId: number
  roomNo: string
  roomName: string
  doorLamp: DoorLampState
  door: DoorState
}

export interface RoomStateApiResponse {
  code: 0
  data: RoomState[]
  msg: string
}

function pickWeighted<T>(random: () => number, items: readonly (readonly [T, number])[]): T {
  const roll = random()
  let accumulated = 0
  for (const [value, weight] of items) {
    accumulated += weight
    if (roll < accumulated) return value
  }
  return items[items.length - 1][0]
}

// 熄灭占多数，少量黄/红灯，避免每次轮询都整层报警
const DOOR_LAMP_WEIGHTS = [
  ['off', 0.45],
  ['green', 0.35],
  ['yellow', 0.15],
  ['red', 0.05],
] as const

const DOOR_WEIGHTS = [
  ['close', 0.8],
  ['open', 0.2],
] as const

export function buildRoomStateResponse(
  random: () => number = Math.random,
): RoomStateApiResponse {
  const data: RoomState[] = buildCardListRooms().map((room) => ({
    roomId: room.roomId,
    roomNo: room.wardroomNum,
    roomName: room.wardroomName,
    doorLamp: pickWeighted(random, DOOR_LAMP_WEIGHTS),
    door: pickWeighted(random, DOOR_WEIGHTS),
  }))
  return { code: 0, data, msg: '' }
}
