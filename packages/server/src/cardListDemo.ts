import { allocateUniquePatientNames } from './cardListNamePool.js'

/** 病区床位 / 患者卡片列表项（与第三方接口字段一致） */
export interface CardListBedItem {
  bedId: number
  roomId: number
  bedNo: string
  bedName: string
  isEmpty: number
  bedStatus: number
  wardId: number
  wardDeptName: string
  wardroomNum: string
  wardroomName: string
  patientPkId: number | null
  hisPatientId: string | null
  patientName: string | null
  sexName: string | null
  age: string | null
  patientStatus: string | null
  patientStatusName: string | null
  admissHospitalDate: number | null
  admissWardDate: number | null
  doctor: string | null
  nurse: string | null
  tend: string | null
  tendName: string | null
  drugFeedback: string | null
  dietLevelName: string | null
  payTypeName: string | null
  safeTakeCare: string | null
  isolationTypeName: string | null
  diagnose: string | null
  patientUpdateTime: number | null
}

export interface CardListApiResponse {
  code: 0
  data: { list: CardListBedItem[]; total: number }
  msg: string
}

const TARGET_TOTAL = 47
/** 空床总数上限（随机分布在全列表，不集中末尾） */
const TARGET_EMPTY_TOTAL = 4

/** 精简真实样本（8 条，均为典型字段组合） */
export const CARD_LIST_SEED: CardListBedItem[] = [
  {
    bedId: 47, roomId: 4, bedNo: 'A5', bedName: 'A5床', isEmpty: 1, bedStatus: 0,
    wardId: 5, wardDeptName: '骨一病区', wardroomNum: 'A2', wardroomName: 'A2房',
    patientPkId: 30, hisPatientId: '012119494', patientName: '王叶', sexName: '女', age: '15岁',
    patientStatus: null, patientStatusName: '',
    admissHospitalDate: 1779292800000, admissWardDate: 1754356500000,
    doctor: '张华军', nurse: '欧文李月', tend: '3', tendName: '一级护理',
    drugFeedback: '青霉素过敏', dietLevelName: '低盐低脂,糖尿病餐', payTypeName: '市公医职工(5%)',
    safeTakeCare: '防跌倒,防坠床,全流,肢体约束,预防下肢静脉血栓', isolationTypeName: '一级隔离',
    diagnose: '腰椎间盘突出', patientUpdateTime: 1779346440000,
  },
  {
    bedId: 1, roomId: 1, bedNo: '1', bedName: 'VIP1床', isEmpty: 1, bedStatus: 0,
    wardId: 5, wardDeptName: '骨一病区', wardroomNum: '1', wardroomName: '抢救室',
    patientPkId: 273, hisPatientId: '012121472', patientName: '朱学锋', sexName: '男', age: '21岁',
    patientStatus: '4', patientStatusName: '病危',
    admissHospitalDate: 1778947200000, admissWardDate: null,
    doctor: '张飞', nurse: null, tend: '2', tendName: '二级护理',
    drugFeedback: '青霉素过敏,花粉类过敏', dietLevelName: '禁食,糖尿病餐,流食', payTypeName: '市公医职工(5%)',
    safeTakeCare: null, isolationTypeName: null,
    diagnose: '吃饭老打嗝', patientUpdateTime: 1779267803000,
  },
  {
    bedId: 2, roomId: 1, bedNo: '2', bedName: 'VIP2床', isEmpty: 1, bedStatus: 0,
    wardId: 5, wardDeptName: '骨一病区', wardroomNum: '1', wardroomName: '抢救室',
    patientPkId: 31, hisPatientId: 'X20001148', patientName: '王琳', sexName: '女性', age: '56岁',
    patientStatus: null, patientStatusName: '',
    admissHospitalDate: 1779120000000, admissWardDate: 1754356500000,
    doctor: null, nurse: '欧文李月', tend: '2', tendName: '二级护理',
    drugFeedback: '青霉素过敏', dietLevelName: '低盐低脂,糖尿病餐', payTypeName: '市公医职工(5%)',
    safeTakeCare: '防跌倒,防坠床,全流,肢体约束,预防下肢静脉血栓', isolationTypeName: '飞沫传染',
    diagnose: null, patientUpdateTime: 1779184440000,
  },
  {
    bedId: 28, roomId: 3, bedNo: '4', bedName: 'VIP4床', isEmpty: 1, bedStatus: 0,
    wardId: 5, wardDeptName: '骨一病区', wardroomNum: '2', wardroomName: 'VIP1室',
    patientPkId: 195, hisPatientId: '012119981', patientName: '李文玉', sexName: '女性', age: '77岁',
    patientStatus: null, patientStatusName: '病重',
    admissHospitalDate: 1779292800000, admissWardDate: 1754356500000,
    doctor: '杜佳', nurse: 'z李刚', tend: '1', tendName: '一级护理',
    drugFeedback: '青霉素过敏', dietLevelName: '低盐低脂,糖尿病餐', payTypeName: '市公医职工(5%)',
    safeTakeCare: '防跌倒,防坠床,全流,肢体约束,预防下肢静脉血栓', isolationTypeName: '特殊传染',
    diagnose: null, patientUpdateTime: 1779340680000,
  },
  {
    bedId: 33, roomId: 5, bedNo: '7', bedName: '7床', isEmpty: 1, bedStatus: 0,
    wardId: 5, wardDeptName: '骨一病区', wardroomNum: '3', wardroomName: '3房',
    patientPkId: 145, hisPatientId: '012119855', patientName: '杜乾秀', sexName: '女', age: '77岁',
    patientStatus: null, patientStatusName: '病重',
    admissHospitalDate: 1779292800000, admissWardDate: 1756192219000,
    doctor: '李江龙', nurse: 'z李刚', tend: '3', tendName: '三级护理',
    drugFeedback: '青霉素过敏', dietLevelName: '低盐低脂', payTypeName: '市公医职工(5%)',
    safeTakeCare: '防跌倒,防坠床,全流,肢体约束,预防下肢静脉血栓', isolationTypeName: '特殊传染',
    diagnose: '孕2产2孕36周妊娠合并高血压', patientUpdateTime: 1779345000000,
  },
  {
    bedId: 34, roomId: 6, bedNo: '10', bedName: '10床', isEmpty: 1, bedStatus: 0,
    wardId: 5, wardDeptName: '骨一病区', wardroomNum: '4', wardroomName: '4房',
    patientPkId: 39, hisPatientId: '012120921', patientName: '何志彬', sexName: '女性', age: '58岁',
    patientStatus: '5', patientStatusName: '病重',
    admissHospitalDate: 1779292800000, admissWardDate: 1756192219000,
    doctor: '李荣光', nurse: '欧文李月', tend: '3', tendName: '三级护理',
    drugFeedback: '花粉类过敏,青霉素过敏', dietLevelName: '低盐低脂', payTypeName: '市公医职工(5%)',
    safeTakeCare: '防跌倒,防坠床,全流,肢体约束,预防下肢静脉血栓', isolationTypeName: '特殊传染',
    diagnose: '孕2产2孕36周妊娠合并高血压', patientUpdateTime: 1779345180000,
  },
  {
    bedId: 35, roomId: 6, bedNo: '11', bedName: '11床', isEmpty: 1, bedStatus: 0,
    wardId: 5, wardDeptName: '骨一病区', wardroomNum: '4', wardroomName: '4房',
    patientPkId: 19, hisPatientId: '012121391', patientName: '宋群珍', sexName: '女', age: '47岁',
    patientStatus: null, patientStatusName: '',
    admissHospitalDate: 1779292800000, admissWardDate: 1754356500000,
    doctor: '方伟', nurse: '欧文李月', tend: '3', tendName: '一级护理',
    drugFeedback: '青霉素过敏', dietLevelName: '低盐低脂,糖尿病餐', payTypeName: '市公医职工(5%)',
    safeTakeCare: '防跌倒,防坠床,全流,肢体约束,预防下肢静脉血栓', isolationTypeName: '一级隔离',
    diagnose: '腰椎间盘突出伴坐骨神经痛', patientUpdateTime: 1779349860000,
  },
  {
    bedId: 3, roomId: 10, bedNo: '27', bedName: '27床', isEmpty: 1, bedStatus: 0,
    wardId: 5, wardDeptName: '骨一病区', wardroomNum: '10', wardroomName: '10房',
    patientPkId: 7, hisPatientId: '012120822', patientName: '吉天秀', sexName: '女性', age: '51岁',
    patientStatus: null, patientStatusName: '病重',
    admissHospitalDate: 1779033600000, admissWardDate: 1756192219000,
    doctor: '杜佳', nurse: 'z李刚', tend: '3', tendName: '三级护理',
    drugFeedback: '青霉素过敏', dietLevelName: '低盐低脂,糖尿病餐', payTypeName: '市公医职工(5%)',
    safeTakeCare: '防跌倒,防坠床,全流,肢体约束,预防下肢静脉血栓', isolationTypeName: '空气传染',
    diagnose: null, patientUpdateTime: 1779092460000,
  },
]

const SEX_NAMES = ['女', '男', '女性'] as const
const TEND_LEVELS = [
  { tend: '1', tendName: '一级护理' },
  { tend: '2', tendName: '二级护理' },
  { tend: '3', tendName: '三级护理' },
] as const
const STATUS_NAMES = ['', '病重', '病危'] as const
const STATUS_CODES: Record<string, string | null> = { '': null, 病重: null, 病危: '4' }
const ROOMS = [
  { roomId: 11, wardroomNum: '11', wardroomName: '11房' },
  { roomId: 12, wardroomNum: '12', wardroomName: '12房' },
  { roomId: 13, wardroomNum: 'A3', wardroomName: 'A3房' },
  { roomId: 14, wardroomNum: 'B1', wardroomName: 'B1房' },
]
const DIAGNOSES = [
  '腰椎间盘突出', '吃饭老打嗝', '孕2产2孕36周妊娠合并高血压',
  '腰痛伴有坐骨神经痛', '腰椎间盘突出伴坐骨神经痛', null,
]
const ISOLATIONS = ['一级隔离', '飞沫传染', '特殊传染', '空气传染', null]
const SAFE_CARE = '防跌倒,防坠床,全流,肢体约束,预防下肢静脉血栓'
const PAY_TYPE = '市公医职工(5%)'

/** 种子中的过敏信息（生成数据从此随机抽取，保证非空） */
const SEED_DRUG_FEEDBACK: string[] = [
  ...new Set(
    CARD_LIST_SEED.map((s) => s.drugFeedback).filter((v): v is string => v != null && v !== ''),
  ),
]

function pickSeedDrugFeedback(index: number): string {
  return SEED_DRUG_FEEDBACK[index % SEED_DRUG_FEEDBACK.length]!
}

/** 种子中的饮食要求（生成数据从此随机抽取，保证非空） */
const SEED_DIET_LEVEL: string[] = [
  ...new Set(
    CARD_LIST_SEED.map((s) => s.dietLevelName).filter((v): v is string => v != null && v !== ''),
  ),
]

function pickSeedDietLevel(index: number): string {
  return SEED_DIET_LEVEL[index % SEED_DIET_LEVEL.length]!
}

const BASE_ADMIT = 1779292800000
const BASE_WARD = 1754356500000

function cloneItem(item: CardListBedItem): CardListBedItem {
  return { ...item }
}

function emptyBedTemplate(bedId: number, roomId: number, bedNo: string, bedName: string, wardroomNum: string, wardroomName: string): CardListBedItem {
  return {
    bedId, roomId, bedNo, bedName, isEmpty: 1, bedStatus: 0,
    wardId: 5, wardDeptName: '骨一病区', wardroomNum, wardroomName,
    patientPkId: null, hisPatientId: null, patientName: null, sexName: null, age: null,
    patientStatus: null, patientStatusName: null,
    admissHospitalDate: null, admissWardDate: null,
    doctor: null, nurse: null, tend: null, tendName: null,
    drugFeedback: null, dietLevelName: null, payTypeName: null,
    safeTakeCare: null, isolationTypeName: null,
    diagnose: null, patientUpdateTime: null,
  }
}

interface ExtraGenIds {
  nextPkId: number
  usedHisIds: Set<string>
  hisSeq: number
}

function allocPatientPkId(ids: ExtraGenIds, usedPkIds: Set<number>): number {
  while (usedPkIds.has(ids.nextPkId)) ids.nextPkId++
  const id = ids.nextPkId
  usedPkIds.add(id)
  ids.nextPkId++
  return id
}

function allocHisPatientId(ids: ExtraGenIds): string {
  while (true) {
    const id = `01213${String(ids.hisSeq).padStart(4, '0')}`
    ids.hisSeq++
    if (!ids.usedHisIds.has(id)) {
      ids.usedHisIds.add(id)
      return id
    }
  }
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = tmp
  }
}

/** 随机挑选 count 个互不重复的下标（用于空床位置） */
function pickRandomIndices(total: number, count: number): Set<number> {
  const indices = Array.from({ length: total }, (_, i) => i)
  shuffleInPlace(indices)
  return new Set(indices.slice(0, Math.min(count, total)))
}

/** 有患者床位：过敏 / 饮食要求不得为空，从种子值中随机选取 */
function fillClinicalFieldsForOccupied(pool: CardListBedItem[]): void {
  for (const item of pool) {
    if (!isOccupiedBed(item)) continue
    if (!item.drugFeedback && SEED_DRUG_FEEDBACK.length > 0) {
      item.drugFeedback = pickSeedDrugFeedback(Math.floor(Math.random() * SEED_DRUG_FEEDBACK.length))
    }
    if (!item.dietLevelName && SEED_DIET_LEVEL.length > 0) {
      item.dietLevelName = pickSeedDietLevel(Math.floor(Math.random() * SEED_DIET_LEVEL.length))
    }
  }
}

function isOccupiedBed(item: CardListBedItem): boolean {
  return item.patientPkId != null || item.patientName != null
}

/** 有患者床位：医生、护士姓名不得为空（种子中为 null 的也会随机补全） */
function fillStaffForOccupiedBeds(pool: CardListBedItem[]): void {
  const exclude = new Set<string>()
  for (const item of pool) {
    if (item.patientName) exclude.add(item.patientName)
    if (item.doctor) exclude.add(item.doctor)
    if (item.nurse) exclude.add(item.nurse)
  }

  let needDoctor = 0
  let needNurse = 0
  for (const item of pool) {
    if (!isOccupiedBed(item)) continue
    if (!item.doctor) needDoctor++
    if (!item.nurse) needNurse++
  }

  const doctors = allocateUniquePatientNames(needDoctor, exclude)
  for (const n of doctors) exclude.add(n)
  const nurses = allocateUniquePatientNames(needNurse, exclude)

  let doctorIdx = 0
  let nurseIdx = 0
  for (const item of pool) {
    if (!isOccupiedBed(item)) continue
    if (!item.doctor) item.doctor = doctors[doctorIdx++]!
    if (!item.nurse) item.nurse = nurses[nurseIdx++]!
  }
}

function collectSeedOccupied(seed: CardListBedItem[]) {
  const names = new Set<string>()
  const pkIds = new Set<number>()
  const hisIds = new Set<string>()
  for (const item of seed) {
    if (item.patientName) names.add(item.patientName)
    if (item.patientPkId != null) pkIds.add(item.patientPkId)
    if (item.hisPatientId) hisIds.add(item.hisPatientId)
  }
  return { names, pkIds, hisIds }
}

function generateExtraItem(
  index: number,
  patientName: string,
  patientPkId: number,
  hisPatientId: string,
): CardListBedItem {
  const i = index
  const bedId = 100 + i
  const room = ROOMS[i % ROOMS.length]
  const bedNo = String(28 + i)
  const statusName = STATUS_NAMES[i % STATUS_NAMES.length]
  const tend = TEND_LEVELS[i % TEND_LEVELS.length]
  const age = `${20 + (i % 60)}岁`

  return {
    bedId,
    roomId: room.roomId,
    bedNo,
    bedName: `${bedNo}床`,
    isEmpty: 1,
    bedStatus: 0,
    wardId: 5,
    wardDeptName: '骨一病区',
    wardroomNum: room.wardroomNum,
    wardroomName: room.wardroomName,
    patientPkId,
    hisPatientId,
    patientName,
    sexName: SEX_NAMES[i % SEX_NAMES.length],
    age,
    patientStatus: STATUS_CODES[statusName] ?? null,
    patientStatusName: statusName,
    admissHospitalDate: BASE_ADMIT - i * 86400000,
    admissWardDate: i % 3 === 0 ? null : BASE_WARD,
    doctor: null,
    nurse: null,
    tend: tend.tend,
    tendName: tend.tendName,
    drugFeedback: pickSeedDrugFeedback(i),
    dietLevelName: pickSeedDietLevel(i),
    payTypeName: PAY_TYPE,
    safeTakeCare: i % 4 === 0 ? null : SAFE_CARE,
    isolationTypeName: ISOLATIONS[i % ISOLATIONS.length],
    diagnose: DIAGNOSES[i % DIAGNOSES.length],
    patientUpdateTime: BASE_ADMIT + i * 60000,
  }
}

let cachedPool: CardListBedItem[] | null = null

/** 构建 47 条数据集（8 条种子 + 39 条生成）；空床 ≤4 且随机分布，过敏信息取自种子 */
export function buildCardListPool(): CardListBedItem[] {
  if (cachedPool) return cachedPool.map(cloneItem)

  const seed = CARD_LIST_SEED.map(cloneItem)
  const { names: usedNames, pkIds: usedPkIds, hisIds: usedHisIds } = collectSeedOccupied(seed)

  const need = TARGET_TOTAL - seed.length
  const seedEmpty = seed.filter((x) => !isOccupiedBed(x)).length
  const genEmpty = Math.max(0, TARGET_EMPTY_TOTAL - seedEmpty)
  const genOccupied = need - genEmpty
  const uniqueNames = allocateUniquePatientNames(genOccupied, usedNames)
  const emptySlots = pickRandomIndices(need, genEmpty)

  const idState: ExtraGenIds = {
    nextPkId: usedPkIds.size > 0 ? Math.max(...usedPkIds) + 1 : 1,
    usedHisIds: new Set(usedHisIds),
    hisSeq: 1,
  }

  const pool: CardListBedItem[] = [...seed]
  let nameIdx = 0
  for (let j = 0; j < need; j++) {
    const bedId = 100 + j
    const room = ROOMS[j % ROOMS.length]
    const bedNo = String(28 + j)
    if (emptySlots.has(j)) {
      pool.push(emptyBedTemplate(bedId, room.roomId, bedNo, `${bedNo}床`, room.wardroomNum, room.wardroomName))
      continue
    }
    const patientName = uniqueNames[nameIdx++]!
    const patientPkId = allocPatientPkId(idState, usedPkIds)
    const hisPatientId = allocHisPatientId(idState)
    pool.push(generateExtraItem(j, patientName, patientPkId, hisPatientId))
  }

  fillStaffForOccupiedBeds(pool)
  fillClinicalFieldsForOccupied(pool)
  shuffleInPlace(pool)
  cachedPool = pool
  return pool.map(cloneItem)
}

export function parseCardListQuery(query: Record<string, unknown>):
  | { pageNo: number; pageSize: number; wardId?: number }
  | { error: string; status: number } {
  const pageNoRaw = query.pageNo
  const pageSizeRaw = query.pageSize
  const pageNo = pageNoRaw == null || pageNoRaw === '' ? 1 : Number(pageNoRaw)
  const pageSize = pageSizeRaw == null || pageSizeRaw === '' ? 10 : Number(pageSizeRaw)

  if (!Number.isFinite(pageNo) || pageNo < 1 || !Number.isInteger(pageNo)) {
    return { error: 'pageNo 必须是大于等于 1 的整数', status: 400 }
  }
  if (!Number.isFinite(pageSize) || pageSize < 1 || !Number.isInteger(pageSize)) {
    return { error: 'pageSize 必须是大于等于 1 的整数', status: 400 }
  }

  let wardId: number | undefined
  if (query.wardId != null && String(query.wardId).trim() !== '') {
    wardId = Number(query.wardId)
    if (!Number.isFinite(wardId)) {
      return { error: 'wardId 无效', status: 400 }
    }
  }

  return { pageNo, pageSize, wardId }
}

export function buildCardListResponse(query: Record<string, unknown>): CardListApiResponse | { error: string; status: number } {
  const parsed = parseCardListQuery(query)
  if ('error' in parsed) return parsed

  let pool = buildCardListPool()
  if (parsed.wardId != null) {
    pool = pool.filter((r) => r.wardId === parsed.wardId)
  }

  const total = pool.length
  const start = (parsed.pageNo - 1) * parsed.pageSize
  const list = pool.slice(start, start + parsed.pageSize)

  return {
    code: 0,
    data: { list, total },
    msg: '',
  }
}
