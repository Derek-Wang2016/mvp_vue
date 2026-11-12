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
  /** 整图染色。`#RRGGBB` 或 `color.字段`。留空则按原图显示。 */
  color?: string
  /** 不透明度，0–100。缺省 100。 */
  opa?: number
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

/** 占位按钮。设备按 action 接线：page 切页，function 用 key 绑定功能。 */
export interface HmiButton {
  type: 'button'
  x: number
  y: number
  w: number
  h: number
  text?: string
  /** 图标库 id，或一段 SVG。设备 JSON 只保留展开后的 svg。 */
  icon?: string
  /** 功能按钮的 LVGL 内置图标，取 LV_SYMBOL_ 后面的名字，例如 CALL。与 svg 同时保留。 */
  symbol?: string
  color?: string
  font?: string
  /** 图标相对文字的位置。left 左右，right 右左，top 上下，bottom 下上。 */
  icon_pos?: 'left' | 'right' | 'top' | 'bottom'
  bg?: string
  radius?: number
  border_w?: number
  border_color?: string
  shadow?: Shadow
  action: 'page' | 'function'
  /** action 为 page 时，跳转到的页面名。 */
  page?: string
  /** action 为 function 时，设备端用来接线的功能键。 */
  key?: string
  locked?: boolean
}

/** 功能块占位。设备按 key 和 params 自己完成这块区域里的功能。 */
export interface HmiBlock {
  type: 'block'
  x: number
  y: number
  w: number
  h: number
  bg?: string
  color?: string
  font?: string
  radius?: number
  border_w?: number
  border_color?: string
  shadow?: Shadow
  /** 设备用来识别功能的键。 */
  key?: string
  /** 参数 JSON 文本。设备 JSON 里写成对象。 */
  params?: string
  locked?: boolean
}

export type HmiShape = HmiRect | HmiLine | HmiImage | HmiIconShape | HmiButton | HmiBlock

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
  /** 有值时，从 mask_at 起把 mask_n 个字符换成这个符号。 */
  mask?: string
  /** 从第几个字符开始遮罩，从 1 计，缺省 2。 */
  mask_at?: number
  /** 遮罩字符个数，缺省 1。 */
  mask_n?: number
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

/** 一屏画面。屏幕尺寸和字典在文档根上，各页共用。 */
export interface HmiPage {
  shapes: HmiShape[]
  cards: HmiCard[]
}

/** 编辑器文档。设备 JSON 保留 version、screen、colors、icons、pages。index 为启动页。 */
export interface HmiDocument {
  version: 3
  screen: { w: number; h: number }
  sample: Record<string, unknown>
  /** 按文字查颜色。图标和拆分块都用这份字典。 */
  colors: Record<string, string>
  /** 按文字查图标。值为图标库 id，或一段 LVGL SVG。 */
  icons: Record<string, string>
  /** 从开源库导入的系统图标。id → LVGL SVG。 */
  library: Record<string, string>
  /** 正在编辑的页面名。不写入设备 JSON。 */
  active: string
  pages: Record<string, HmiPage>
}

export function currentPage(doc: HmiDocument): HmiPage {
  const pages = doc.pages ?? {}
  return pages[doc.active] ?? pages.index ?? { shapes: [], cards: [] }
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
