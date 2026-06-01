/** 病区统计 KEY-VALUE 项（与第三方 KEY/VALUE 字段一致） */
export interface WardKvItem {
  KEY: string
  VALUE: string
}

export interface WardKvApiResponse {
  code: 0
  data: WardKvItem[]
  msg: string
}

/** 统计指标 KEY 列表（顺序固定，便于大屏按行绑定） */
export const WARD_STAT_KEYS = [
  '病人总数',
  '病重',
  '病危',
  '一级护理',
  '二级护理',
  '三级护理',
  '特级护理',
  '今日入院',
  '今日出院',
  '今日手术',
  '今日转床',
  '跌倒高危',
  '接触隔离',
  '飞沫隔离',
  '空气隔离',
] as const

function randomInt(min: number, max: number): number {
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  return Math.floor(lo + Math.random() * (hi - lo + 1))
}

/** 各指标单值随机区间（与病区规模大致相符） */
function singleValueForKey(key: string): number {
  switch (key) {
    case '病人总数':
      return randomInt(35, 52)
    case '病重':
      return randomInt(2, 12)
    case '病危':
      return randomInt(0, 5)
    case '一级护理':
      return randomInt(5, 18)
    case '二级护理':
      return randomInt(8, 22)
    case '三级护理':
      return randomInt(4, 56)  
    case '特级护理':
      return randomInt(0, 6)
    case '今日入院':
    case '今日出院':
    case '今日手术':
    case '今日转床':
      return randomInt(0, 9)
    case '跌倒高危':
      return randomInt(1, 10)
    case '接触隔离':
    case '飞沫隔离':
    case '空气隔离':
      return randomInt(0, 8)
    default:
      return randomInt(1, 20)
  }
}

/** VALUE 为单个数字字符串 */
export function buildWardKvSingleResponse(): WardKvApiResponse {
  const data: WardKvItem[] = WARD_STAT_KEYS.map((KEY) => ({
    KEY,
    VALUE: String(singleValueForKey(KEY)),
  }))
  return { code: 0, data, msg: '' }
}

/** VALUE 为 1～30 个逗号分隔数字 */
function buildMultiValueString(): string {
  const count = randomInt(1, 30)
  const nums = Array.from({ length: count }, () => randomInt(1, 99))
  return nums.join(',')
}

/** VALUE 为逗号分隔的多数字字符串（每项 1～30 个数字） */
export function buildWardKvMultiResponse(): WardKvApiResponse {
  const data: WardKvItem[] = WARD_STAT_KEYS.map((KEY) => ({
    KEY,
    VALUE: buildMultiValueString(),
  }))
  return { code: 0, data, msg: '' }
}
