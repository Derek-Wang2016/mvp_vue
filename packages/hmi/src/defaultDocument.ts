import type { HmiDocument } from './types'

const sample = {
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

export function createDefaultDocument(): HmiDocument {
  return {
    version: 2,
    screen: { w: 1024, h: 600 },
    sample,
    colors: {
      一级护理: '#FF0000',
      二级护理: '#E67E22',
      三级护理: '#18E718',
      防坠床: '#FF0000',
      防窒息: '#02AC38',
      防跌倒: '#E67E22',
      防压疮: '#8E44AD',
      防走失: '#2980B9',
      防烫伤: '#C0392B',
      防脱管: '#16A085',
      防误吸: '#D35400',
      防血栓: '#1A5276',
      防感染: '#6C3483',
      留陪人: '#1E8449',
      绝对卧床: '#1F4E79',
    },
    icons: {
      一级护理: 'care-1',
      二级护理: 'care-2',
      三级护理: 'care-3',
    },
    library: {},
    shapes: [
      { type: 'rect', x: 0, y: 0, w: 1024, h: 600, bg: '#33ABE4' },
      { type: 'rect', x: 0, y: 0, w: 1024, h: 54, bg: '#0E3A5F' },
      { type: 'line', x1: 0, y1: 54, x2: 1024, y2: 54, width: 1, color: '#7EC8E3' },
      { type: 'icon', x: 260, y: 343, w: 40, h: 40, prop: 'TEND_NAME' },
    ],
    cards: [
      {
        x: 0, y: 0, w: 1024, h: 54,
        cols: 1, rows: 1,
        items: [
          { type: 'value', prop: 'CLOCK', col: 0, row: 0, font: 'status', color: '#FFFFFF', align: 'end', format: '%Y年%m月%d日 %H:%M:%S %A' },
        ],
      },
      {
        x: 16, y: 67, w: 210, h: 520,
        bg: '#EBF7FC', radius: 10,
        shadow: { width: 12, color: '#104866', ofs_y: 4 },
        cols: 1, gap: 4,
        row_h: [110, 32, 40, 168, 32, 48],
        items: [
          { type: 'value', prop: 'BEDNAME', row: 0, font: 'num_huge', color: '#222222', align: 'center' },
          { type: 'label', text: '入院时间', row: 1, font: 'default', color: '#333333', align: 'center' },
          { type: 'value', prop: 'ADMISS_HOSPITAL_DATE', row: 2, font: 'status', color: '#222222', align: 'center' },
          { type: 'qrcode', prop: 'QRCODE', row: 3, size: 140, align: 'center' },
          { type: 'label', text: '住院号', row: 4, font: 'default', color: '#333333', align: 'center' },
          { type: 'value', prop: 'PATIENTCHECKIN_NO', row: 5, font: 'status', color: '#222222', align: 'center' },
        ],
      },
      {
        x: 247, y: 67, w: 490, h: 244,
        bg: '#EBF7FC', radius: 10,
        shadow: { width: 12, color: '#104866', ofs_y: 4 },
        rows: 3, gap: 8,
        col_w: [300, 80, 90],
        row_h: [120, 52, 52],
        items: [
          { type: 'value', prop: 'PATIENT_NAME', col: 0, row: 0, font: 'num_huge', bold: 1, color: '#222222', align: 'start' },
          { type: 'value', prop: 'SEX_NAME', col: 1, row: 0, font: 'status', color: '#222222', align: 'center' },
          { type: 'value', prop: 'AGE', col: 2, row: 0, font: 'status', color: '#222222', align: 'center' },
          { type: 'value', prop: 'DOCTOR_CURE', col: 0, row: 1, colspan: 3, title: '主治医生:', title_font: 'status', title_color: '#222222', font: 'status', color: '#222222', align: 'start' },
          { type: 'value', prop: 'NURSE', col: 0, row: 2, colspan: 3, title: '责任护士:', title_font: 'status', title_color: '#222222', font: 'status', color: '#222222', align: 'start' },
        ],
      },
      cardValue(247, 323, 'TEND_NAME', '级', 'color.TEND_NAME'),
      cardValue(247, 415, 'DRUG_FEEDBACK', '敏', '#FF0000'),
      cardValue(247, 507, 'DIET_LEVEL_NAME', '食', '#1A6F99'),
      {
        x: 758, y: 67, w: 250, h: 420,
        bg: '#EBF7FC', radius: 10,
        shadow: { width: 12, color: '#104866', ofs_y: 4 },
        cols: 1, rows: 1,
        items: [
          {
            type: 'split', prop: 'SAFETAKECARE', split: ',',
            font: '33', color: '#FFFFFF', item_h: 73, gap: 8,
            default_color: '#7C7C7C',
          },
        ],
      },
    ],
  }
}

function cardValue(x: number, y: number, prop: string, title: string, titleColor: string) {
  return {
    x, y, w: 490, h: 80,
    bg: '#EBF7FC', radius: 12,
    shadow: { width: 12, color: '#104866', ofs_y: 4 },
    cols: 1, rows: 1,
    items: [
      {
        type: 'value' as const, prop, title, title_font: 'num_large', title_color: titleColor,
        font: '35', color: '#222222', align: 'start' as const,
      },
    ],
  }
}
