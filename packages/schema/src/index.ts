// ===== 组件类型 =====
export type ComponentType = 'text' | 'image' | 'bar-chart' | 'line-chart' | 'pie-chart' | 'table' | 'iframe' | 'video' | 'datetime' | 'analog-clock' | 'page-nav-button' | 'card-list' | 'key-value-tag' | 'map'

export {
  type MapLevel,
  type MapDisplayMode,
  type MapVisualStyle,
  MAP_VISUAL_STYLE_OPTIONS,
  getMapVisualStyleLabel,
  type MapSymbolPreset,
  MAP_SYMBOL_PRESETS,
  type MapProvinceOption,
  MAP_PROVINCE_OPTIONS,
  CHINA_COUNTRY_ADCODE,
  DEFAULT_MAP_PROVINCE_ADCODE,
  getMapEchartsKey,
  resolveMapConfig,
  getMapProvinceName,
} from './mapRegions'

/** 页面跳转按钮 — 内置图标 */
export type PageNavIconPreset = 'arrow-right' | 'home' | 'layout-grid' | 'bar-chart' | 'external-link' | 'none'

/** 页面跳转按钮 — 默认配色 */
export interface PageNavButtonColors {
  textColor: string
  borderColor: string
  bgColorFrom: string
  bgColorTo: string
  glowColor: string
}

export const DEFAULT_PAGE_NAV_BUTTON_COLORS: PageNavButtonColors = {
  textColor: '#e2e8f0',
  borderColor: 'rgba(129, 140, 248, 0.45)',
  bgColorFrom: 'rgba(99, 102, 241, 0.35)',
  bgColorTo: 'rgba(15, 23, 42, 0.92)',
  glowColor: 'rgba(99, 102, 241, 0.28)',
}

export const PAGE_NAV_ICON_PRESETS: PageNavIconPreset[] = [
  'arrow-right',
  'home',
  'layout-grid',
  'bar-chart',
  'external-link',
  'none',
]

// ===== 卡片字段布局 =====
export type CardFieldLayoutId = 'default' | 'label-above' | 'value-only' | 'divider'

export interface CardFieldLayoutDef {
  id: CardFieldLayoutId
  label: string
  containerClass: string
  labelClass: string
  valueClass: string
}

export const CARD_FIELD_LAYOUTS: CardFieldLayoutDef[] = [
  { id: 'default',     label: '标签+值（横排）', containerClass: 'flex flex-row items-center gap-1.5 min-w-0 w-full', labelClass: 'shrink-0 whitespace-nowrap text-right', valueClass: 'card-field-value-viewport flex-1 min-w-0' },
  { id: 'label-above', label: '标签在上',         containerClass: 'flex flex-col min-w-0 w-full', labelClass: 'leading-tight shrink-0', valueClass: 'card-field-value-viewport min-w-0 w-full' },
  { id: 'value-only',  label: '仅值',             containerClass: 'flex items-center min-w-0 w-full', labelClass: 'hidden', valueClass: 'card-field-value-viewport min-w-0 w-full' },
  { id: 'divider',     label: '分隔线',           containerClass: 'flex items-center', labelClass: 'hidden', valueClass: 'hidden' },
]

export function getCardFieldLayout(id: CardFieldLayoutId | undefined): CardFieldLayoutDef {
  return CARD_FIELD_LAYOUTS.find(l => l.id === id) ?? CARD_FIELD_LAYOUTS[0]!
}

// ===== 卡片字段配置 =====
/** 卡片字段是否在渲染器中显示；省略或为 true 时显示 */
export function isCardFieldVisible(f: CardFieldConfig): boolean {
  return f.visible !== false
}

export interface CardFieldConfig {
  field: string
  label: string
  /** 是否在卡片中渲染；默认 true */
  visible?: boolean
  gridRow?: number
  gridCol?: number
  gridRowSpan?: number
  gridColSpan?: number
  layoutId?: CardFieldLayoutId
  fontSize?: string
  textColor?: string
  bgColor?: string
  textAlign?: 'left' | 'center' | 'right'
  fontWeight?: 'normal' | 'bold'
  dateFormat?: string
  valueDisplay?: 'text' | 'icon'
  /** 将字段值按 tagSeparator 切分为多个 tag 展示 */
  tagSplitEnabled?: boolean
  /** 切分分隔符，默认英文逗号 `,` */
  tagSeparator?: string
  /**
   * 每个 tag 的底色。推荐 `DICT:$VALUE`：用切分后的片段文本查颜色字典（如「青霉素」「黄瓜」各查一次）；
   * 也可填固定色值如 `#334155`。裸写 `DICT` 同 `DICT:$VALUE`（兼容旧配置）。
   */
  tagBgColor?: string
  /** 字段值文本是否按页面缩略语字典精确匹配并显示缩略语 */
  abbrevDictEnabled?: boolean
}

export const DEFAULT_CARD_TAG_SEPARATOR = ','

/** Tag 底色：按当前切分片段查颜色字典（每个 tag 各查一次） */
export const CARD_TAG_BG_COLOR_DICT_VALUE = 'DICT:$VALUE'

export function getCardFieldTagSeparator(field: CardFieldConfig): string {
  const sep = field.tagSeparator?.trim()
  return sep === '' || sep === undefined ? DEFAULT_CARD_TAG_SEPARATOR : sep
}

export function splitCardFieldValueToTags(raw: unknown, separator: string): string[] {
  const text = String(raw ?? '').trim()
  if (!text) return []
  if (!separator) return [text]
  return text.split(separator).map((part) => part.trim()).filter((part) => part.length > 0)
}

/** 按 tag 片段解析底色（默认 DICT:$VALUE → 用片段文本查颜色字典） */
export function resolveCardTagBgColor(
  colorDict: ColorDictEntry[] | undefined,
  item: Record<string, unknown>,
  tagBgColor: string | undefined,
  segment: string,
): string | undefined {
  const cfg = tagBgColor?.trim() || CARD_TAG_BG_COLOR_DICT_VALUE
  if (!cfg.startsWith('DICT')) return cfg
  if (!colorDict || colorDict.length === 0) return undefined

  const dictSpec = cfg.startsWith('DICT:') ? cfg.slice(5).trim() : ''
  // DICT / DICT:$VALUE → 每个 tag 用切分后的文本查字典
  const useSegment =
    dictSpec === '' ||
    dictSpec === '$VALUE' ||
    dictSpec.toUpperCase() === '$VALUE'

  const matchValue = useSegment ? segment : String(item[dictSpec] ?? '')
  return colorDict.find((e) => e.key === matchValue)?.matchColor
}

/** 卡片级空态：监听字段为空时显示空值图标区块 */
export interface CardEmptyDisplayConfig {
  enabled?: boolean
  /** 判空监听的字段名（对应 item[field]） */
  watchFields: string[]
  /** any=任一为空即空态；all=全部为空才空态。默认 any */
  watchMode?: 'any' | 'all'
  /** 引用页面 iconDict 条目的 key */
  iconDictKey?: string
  /** 内联图标（与 IconDictEntry 同形） */
  iconType?: 'preset' | 'custom'
  iconName?: string
  iconSvg?: string
  /** 空态下仍渲染的字段 field 名列表 */
  retainFields?: string[]
  fontSize?: string
  textColor?: string
  bgColor?: string
  textAlign?: 'left' | 'center' | 'right'
  gridRow?: number
  gridCol?: number
  gridRowSpan?: number
  gridColSpan?: number
}

export function isCardFieldValueEmpty(raw: unknown): boolean {
  if (raw == null) return true
  if (typeof raw === 'string') return raw.trim() === ''
  return false
}

export function evaluateCardEmpty(
  item: Record<string, unknown>,
  config: CardEmptyDisplayConfig | undefined,
): boolean {
  if (!config?.enabled || !config.watchFields?.length) return false
  const checks = config.watchFields.map((f) => isCardFieldValueEmpty(item[f]))
  return config.watchMode === 'all' ? checks.every(Boolean) : checks.some(Boolean)
}

function readCardGridGapValue(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

/** 卡片内部网格行/列间距；未设置时分项回退到 cardGridGap，再默认 8 */
export function resolveCardGridGaps(props: Record<string, unknown>): { row: number; column: number } {
  const fallback = readCardGridGapValue(props.cardGridGap, 8)
  return {
    row: readCardGridGapValue(props.cardGridRowGap, fallback),
    column: readCardGridGapValue(props.cardGridColumnGap, fallback),
  }
}

// ===== 日期格式化 =====
export const DATE_FORMAT_PRESETS: { label: string; value: string }[] = [
  { label: '2026-05-18', value: 'YYYY-MM-DD' },
  { label: '2026-05-18 14:30', value: 'YYYY-MM-DD HH:mm' },
  { label: '2026-05-18 14:30:00', value: 'YYYY-MM-DD HH:mm:ss' },
  { label: '05-18', value: 'MM-DD' },
  { label: '14:30', value: 'HH:mm' },
  { label: '14:30:00', value: 'HH:mm:ss' },
  { label: '05-18 14:30', value: 'MM-DD HH:mm' },
  { label: '2026年05月18日', value: 'YYYY年MM月DD日' },
  { label: '2026/05/18', value: 'YYYY/MM/DD' },
]

export function formatDateValue(raw: unknown, fmt: string): string {
  if (raw == null || raw === '') return ''
  let d: Date
  if (raw instanceof Date) {
    d = raw
  } else {
    const n = Number(raw)
    // timestamp in seconds (10 digits) or milliseconds (13 digits)
    if (!isNaN(n) && n > 0) {
      d = new Date(n < 1e12 ? n * 1000 : n)
    } else {
      d = new Date(String(raw))
    }
    if (isNaN(d.getTime())) return String(raw)
  }

  const pad = (n: number, len = 2) => String(n).padStart(len, '0')
  const yyyy = d.getFullYear()
  const MM = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const HH = pad(d.getHours())
  const mm = pad(d.getMinutes())
  const ss = pad(d.getSeconds())

  return fmt
    .replace('YYYY', String(yyyy))
    .replace('MM', MM)
    .replace('DD', dd)
    .replace('HH', HH)
    .replace('mm', mm)
    .replace('ss', ss)
}

// ===== 颜色字典 =====
export interface ColorDictEntry {
  id: string
  key: string
  matchColor: string
}

// ===== 缩略语字典 =====
export interface AbbrevDictEntry {
  id: string
  /** 完整文本（精确匹配字段值） */
  key: string
  /** 命中后展示的缩略语 */
  abbrev: string
}

/** 按 key 精确匹配，命中则返回 abbrev，否则返回原文 */
export function resolveAbbrevDictValue(
  abbrevDict: AbbrevDictEntry[] | undefined,
  text: string,
): string {
  if (!text || !abbrevDict?.length) return text
  const hit = abbrevDict.find((e) => e.key === text)
  return hit?.abbrev ?? text
}

// ===== 图标字典 =====
export interface IconDictEntry {
  id: string
  key: string
  iconType: 'preset' | 'custom'
  iconName?: string   // preset: 'tabler:activity'
  iconSvg?: string    // custom: raw <svg>...</svg>
}

// ===== 数据源类型 =====
export type DataSourceType = 'rest' | 'sql' | 'static'

// ===== 数据源 =====
export interface DataSource {
  id: string
  type: DataSourceType

  // REST
  url?: string
  method?: 'GET' | 'POST'
  headers?: Record<string, string>
  dataPath?: string

  // SQL
  query?: string

  // Static
  staticData?: unknown

  // Refresh
  refreshInterval?: number  // seconds, 0 = load once
}

// ===== 组件定义 =====
export interface PageComponent {
  id: string
  type: ComponentType
  x: number
  y: number
  w: number
  h: number
  props: Record<string, unknown>
  dataSourceId?: string
}

// ===== 页面默认尺寸 =====
export const DEFAULT_PAGE_WIDTH = 1920
export const DEFAULT_PAGE_HEIGHT = 1080

// ===== 图表文字默认样式 =====
export const DEFAULT_CHART_TEXT_FONT_SIZE = 16
export const DEFAULT_CHART_TEXT_COLOR = '#cbd5e1'

export { buildPieSeriesLayout, type PieSeriesLayout } from './pieChartLayout'
export { parseKeyValueTagKeyList, filterKeyValueTagItems } from './keyValueTag'

// ===== 页面 Schema =====
export type BgGradient = 'none' | 'linear-top' | 'linear-left' | 'linear-diagonal' | 'radial'

export interface PageSchema {
  width: number
  height: number
  bgColor?: string
  bgGradient?: BgGradient
  bgImage?: string
  bgOpacity?: number
  dataSources?: DataSource[]
  colorDict?: ColorDictEntry[]
  iconDict?: IconDictEntry[]
  abbrevDict?: AbbrevDictEntry[]
  components: PageComponent[]
}

// ===== API 响应 =====
export interface PageRecord {
  id: number
  name: string
  schemaJson: PageSchema
  createdAt: string
}
