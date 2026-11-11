export type Align = 'start' | 'center' | 'end'

export interface Shadow {
  width?: number
  color?: string
  ofs_x?: number
  ofs_y?: number
}

export interface HmiRect {
  type: 'rect' | 'circle'
  x: number
  y: number
  w: number
  h: number
  bg?: string
  radius?: number
  border_w?: number
  border_color?: string
  shadow?: Shadow
  locked?: boolean
}

export interface HmiLine {
  type: 'line'
  x1: number
  y1: number
  x2: number
  y2: number
  width?: number
  color?: string
  locked?: boolean
}

export interface HmiImage {
  type: 'image'
  x: number
  y: number
  w: number
  h: number
  src: string
  url?: string
  locked?: boolean
}

/** 绝对定位的图标。field 用字段文本查字典；static 直接指定图标和颜色。 */
export interface HmiIconShape {
  type: 'icon'
  x: number
  y: number
  w: number
  h: number
  mode?: 'field' | 'static'
  prop?: string
  /** 静态图标：图标库 id，或一段 SVG。 */
  icon?: string
  color?: string
  locked?: boolean
}

export type HmiShape = HmiRect | HmiLine | HmiImage | HmiIconShape

export interface HmiItem {
  type: 'label' | 'value' | 'qrcode' | 'split'
  text?: string
  prop?: string
  title?: string
  title_font?: string
  title_color?: string
  font?: string
  bold?: number
  color?: string
  align?: Align
  format?: string
  pad_x?: number
  gap?: number
  col?: number
  row?: number
  colspan?: number
  rowspan?: number
  size?: number
  split?: string
  /** column 为纵向，row 为从左往右的列。缺省 column。 */
  flow?: 'column' | 'row'
  item_h?: number
  default_color?: string
}

export interface HmiCard {
  x: number
  y: number
  w: number
  h: number
  bg?: string
  radius?: number
  border_w?: number
  border_color?: string
  shadow?: Shadow
  cols?: number
  rows?: number
  gap?: number
  col_w?: number[]
  row_h?: number[]
  items: HmiItem[]
  locked?: boolean
}

/** 编辑器文档。下发设备时只保留 version、shapes、cards。 */
export interface HmiDocument {
  version: 2
  screen: { w: number; h: number }
  sample: Record<string, unknown>
  /** 按文字查颜色。图标和拆分块都用这份字典。 */
  colors: Record<string, string>
  /** 按文字查图标。值为图标库 id，或一段 LVGL SVG。 */
  icons: Record<string, string>
  /** 从开源库导入的系统图标。id → LVGL SVG。 */
  library: Record<string, string>
  shapes: HmiShape[]
  cards: HmiCard[]
}

export type Selection =
  | { kind: 'shape'; index: number }
  | { kind: 'card'; index: number }
  | { kind: 'item'; card: number; index: number }

export const FONT_PX: Record<string, number> = {
  default: 28,
  status: 30,
  num_large: 47,
  num_huge: 84,
}

export const LIMITS = {
  lines: 16,
  tracks: 8,
  bindings: 40,
}
