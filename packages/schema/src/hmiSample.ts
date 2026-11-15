/**
 * HMI 编辑器与床头卡的默认样例数据。
 *
 * 单一来源：
 * - editor 新文档的 `doc.sample` 初值
 * - 新建样例草稿的模板
 * - server 建表时写入的内置样例（`builtin = 1`，只读）
 *
 * 字段名直接来自床头卡接口，设备端和 Web 预览都用这一份。
 */
export const HMI_DEFAULT_SAMPLE: Record<string, unknown> = {
  BEDNAME: '6床',
  ADMISS_HOSPITAL_DATE: '2025-11-10',
  QRCODE: '01212074812345',
  PATIENTCHECKIN_NO: '012119430',
  PATIENT_NAME: '万春江',
  SEX_NAME: '女',
  AGE: '35岁',
  DOCTOR_CURE: '',
  NURSE: '欧文李月',
  TEND_NAME: '三级护理',
  COLORRED: 24,
  COLORGREEN: 231,
  COLORBLUE: 24,
  DRUG_FEEDBACK: '花粉类过敏,青霉素过敏',
  COMMUNICABLE_DISEASES_NAME: '飞沫隔离',
  DIET_LEVEL_NAME: '低盐低脂',
  SAFETAKECARE: '防窒息,防坠床',
}

/** 内置样例在库里的名称。只读，用户只能另存为副本再改。 */
export const HMI_BUILTIN_SAMPLE_NAME = '默认样例'

/** 序列化成缩进 JSON，供编辑器文本域和数据库存储使用。 */
export function hmiDefaultSampleJson(): string {
  return JSON.stringify(HMI_DEFAULT_SAMPLE, null, 2)
}
