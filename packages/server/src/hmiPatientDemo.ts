import { randomFullName } from './cardListNamePool.js'

const TEND = ['一级护理', '二级护理', '三级护理'] as const
/** 三级护理与床头卡接口样例一致：COLORRED 24、COLORGREEN 231、COLORBLUE 24。 */
const CARE_RGB: Record<(typeof TEND)[number], [number, number, number]> = {
  一级护理: [255, 0, 0],
  二级护理: [230, 126, 34],
  三级护理: [24, 231, 24],
}
const DIET = ['普食', '低盐低脂', '糖尿病饮食', '流质']
const ALLERGY = ['花粉类过敏', '青霉素过敏', '头孢过敏', '海鲜过敏']
const ISOLATION = ['特殊隔离', '一级隔离', '二级隔离', '空气隔离', '飞沫隔离', '接触隔离']
const SAFE = ['防坠床', '防窒息', '防跌倒', '防压疮', '防走失', '防烫伤', '防脱管', '防误吸', '防血栓', '防感染', '留陪人', '绝对卧床']
const SEX = ['男', '女']
const DIAGNOSES = [
  '腰椎间盘突出症（L4/5）',
  '腰椎间盘突出症伴坐骨神经痛',
  '腰椎管狭窄症',
  '颈椎病（神经根型）',
  '高血压病3级（极高危）',
  '2型糖尿病',
  '社区获得性肺炎',
  '慢性阻塞性肺疾病急性加重',
  '冠心病 不稳定型心绞痛',
  '脑梗死恢复期',
  '股骨颈骨折术后',
  '孕2产1孕36周 妊娠期高血压',
  '急性胃肠炎',
  '慢性肾功能不全',
  '支气管哮喘急性发作',
]

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]!
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function dateOnly(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 与床头卡生产接口相同的信封，obj 里是一条随机病人。 */
export function buildHmiPatientResponse() {
  const name = randomFullName()
  const sex = pick(SEX)
  const age = 18 + Math.floor(Math.random() * 70)
  const bed = 1 + Math.floor(Math.random() * 40)
  const room = 1 + Math.floor(Math.random() * 12)
  const admit = new Date()
  admit.setDate(admit.getDate() - Math.floor(Math.random() * 20))
  const checkin = String(12000000 + Math.floor(Math.random() * 800000))
  const tend = pick(TEND)
  const [red, green, blue] = CARE_RGB[tend]
  const allergy = [...ALLERGY].sort(() => Math.random() - 0.5).slice(0, 2)
  const diet = [...DIET].sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 3))
  const isolation = [...ISOLATION].sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 3))
  const safe = [...SAFE].sort(() => Math.random() - 0.5).slice(0, 6)
  const diagnose = [...DIAGNOSES].sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 2))
  return {
    res: 'ok',
    datatype: '病人信息',
    obj: [
      {
        BEDNAME: `${bed}床`,
        ROOMNAME: `${room}房`,
        PATIENT_NAME: name,
        SEX_NAME: sex,
        AGE: `${age}岁`,
        ADMISS_HOSPITAL_DATE: dateOnly(admit),
        PATIENTCHECKIN_NO: checkin,
        QRCODE: checkin,
        DOCTOR_CURE: randomFullName(),
        NURSE: randomFullName(),
        TEND_NAME: tend,
        COLORRED: red,
        COLORGREEN: green,
        COLORBLUE: blue,
        DRUG_FEEDBACK: allergy.join(','),
        COMMUNICABLE_DISEASES_NAME: isolation.join(','),
        DIET_LEVEL_NAME: diet.join(','),
        SAFETAKECARE: safe.join(','),
        DIAGNOSE: diagnose.join('；'),
      },
    ],
  }
}
