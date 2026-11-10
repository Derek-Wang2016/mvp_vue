export type HmiNodeType = 'container' | 'value' | 'label' | 'qrcode' | 'split' | 'image'

export interface HmiLayout {
  flow?: 'row' | 'column'
  gap_row?: number
  gap_col?: number
  align_main?: 'start' | 'center' | 'end' | 'space-between'
  align_cross?: 'start' | 'center' | 'end' | 'stretch'
}

export interface HmiNode {
  type: string
  id?: string
  children?: HmiNode[]
  prop?: string
  title?: string
  format?: string
  src?: string
  split?: string
  item_h?: number
  gap?: number
  colors?: Record<string, string>
  default_color?: string
  bg_color?: string
  radius?: number
  pad?: number
  pad_x?: number
  pad_y?: number
  pad_left?: number
  pad_right?: number
  text_ofs_y?: number
  title_font?: string
  title_color?: string
  title_style?: string
  value_font?: string
  value_color?: string
  value_style?: string
  border?: { width?: number; color?: string }
  shadow?: { width?: number; color?: string; ofs_x?: number; ofs_y?: number }
  size?: { w?: number; h?: number }
  layout?: HmiLayout
  [key: string]: unknown
}

/** 编辑器文档。下发设备时去掉 sample。 */
export interface HmiDocument {
  version: 1
  screen: { w: number; h: number }
  fonts: Record<string, number>
  colors: Record<string, string>
  abbrs: Record<string, string>
  sample: Record<string, unknown>
  cards: HmiNode[]
}

export const NODE_TYPES: { type: HmiNodeType; label: string }[] = [
  { type: 'container', label: '容器' },
  { type: 'value', label: '键值' },
  { type: 'label', label: '标题' },
  { type: 'qrcode', label: '二维码' },
  { type: 'split', label: '拆分标签' },
  { type: 'image', label: '图片' },
]
