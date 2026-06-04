// ===== 组件类型 =====
export type ComponentType = 'text' | 'image' | 'icon' | 'rectangle' | 'line' | 'bar-chart' | 'line-chart' | 'pie-chart' | 'table' | 'iframe' | 'video' | 'datetime' | 'analog-clock' | 'page-nav-button' | 'card-list' | 'card' | 'key-value-tag' | 'map'

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
/** 卡片字段值区域展示方式 */
export type CardFieldValueDisplay = 'text' | 'icon' | 'qrcode'

export const DEFAULT_CARD_QR_SIZE_PX = 64
export const DEFAULT_CARD_QR_MARGIN = 1
export const DEFAULT_CARD_QR_COLOR = '#000000'
export const DEFAULT_CARD_QR_BG_COLOR = '#ffffff'

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
  /** 值区域字号 */
  fontSize?: string
  /** 值区域文字色；支持 DICT: */
  textColor?: string
  /** 值区域底色；支持 DICT:字段名 */
  bgColor?: string
  /** 值区域对齐 */
  textAlign?: 'left' | 'center' | 'right'
  /** 值区域粗细 */
  fontWeight?: 'normal' | 'bold'
  /** 标签字号；未设时继承 fontSize */
  labelFontSize?: string
  /** 标签文字色；未设时继承 textColor；支持 DICT: */
  labelTextColor?: string
  /** 标签底色；支持 DICT:字段名；仅作用于标签区域 */
  labelBgColor?: string
  /** 标签对齐；未设时「标签+值」右对齐，「标签在上」左对齐 */
  labelTextAlign?: 'left' | 'center' | 'right'
  /** 标签粗细；未设时继承 fontWeight */
  labelFontWeight?: 'normal' | 'bold'
  dateFormat?: string
  /** 值区域展示方式：原始文本、图标字典匹配、二维码 */
  valueDisplay?: CardFieldValueDisplay
  /** 二维码边长（px），valueDisplay 为 qrcode 时生效 */
  qrSizePx?: number
  /** 二维码 quiet zone（模块数），默认 1 */
  qrMargin?: number
  /** 二维码前景色（模块色） */
  qrColor?: string
  /** 二维码背景色 */
  qrBgColor?: string
  /** 将字段值按 tagSeparator 切分为多个 tag 展示 */
  tagSplitEnabled?: boolean
  /** 切分分隔符，默认英文逗号 `,` */
  tagSeparator?: string
  /**
   * 每个 tag 的底色。推荐 `DICT:$VALUE`：用切分后的片段文本查颜色字典（如「青霉素」「黄瓜」各查一次）；
   * 也可填固定色值如 `#334155`。裸写 `DICT` 同 `DICT:$VALUE`（兼容旧配置）。
   */
  tagBgColor?: string
  /**
   * Tag 切分后的排列：`inline` 一行多项（默认）；`stack` 一行一项，底色铺满值区域行宽
   */
  tagLayout?: 'inline' | 'stack'
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
  iconType?: 'preset' | 'custom' | 'saved'
  iconName?: string
  iconSvg?: string
  savedIconId?: number
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

// ===== 自定义 SVG 图标库（Server /api/custom-icons） =====
import type { CustomIconRecord, CustomIconListItem } from './savedIcons'
export type { CustomIconRecord, CustomIconListItem }
export {
  savedIconsToMap,
  collectReferencedSavedIconIds,
  buildSavedIconsSnapshot,
  mergeSavedIconIntoPool,
  listItemToRecord,
  iconEntryPickerLabel,
  collectSavedIconsFromSchema,
} from './savedIcons'

export { iconPropsToDictEntry, iconPickerResultToProps, resolveIconLayoutSizes, type IconLayoutSizes } from './iconComponent'
export {
  type RectangleComponentProps,
  DEFAULT_RECTANGLE_PROPS,
  resolveRectangleProps,
  resolveRectangleStyle,
  type RectangleInlineStyle,
} from './rectangleComponent'
export {
  type LineOrientation,
  type LineStrokeStyle,
  type LineCap,
  type LineComponentProps,
  DEFAULT_LINE_PROPS,
  LINE_ORIENTATION_OPTIONS,
  LINE_STROKE_STYLE_OPTIONS,
  LINE_CAP_OPTIONS,
  resolveLineProps,
  resolveLineEndpoints,
  resolveLineStrokeDasharray,
  resolveLineSvgAttrs,
  type LineSvgEndpoints,
  type LineSvgAttrs,
} from './lineComponent'
export {
  tintInlineSvg,
  svgToMaskDataUrl,
  canRecolorInlineSvg,
  countDistinctPaintColors,
  resolveInlineSvgColorMode,
  type InlineSvgColorMode,
} from './svgIconTint'

// ===== 图标字典 =====
export interface IconDictEntry {
  id: string
  key: string
  iconType: 'preset' | 'custom' | 'saved'
  iconName?: string   // preset: 'tabler:activity'
  iconSvg?: string    // custom: 内联 <svg>...</svg>
  savedIconId?: number // saved: 引用 CustomIconRecord.id
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
  /** 页面 URL 查询参数名；有值时拼接到 REST URL 同名 query 参数 */
  urlQueryParam?: string
  /** 页面 URL 无该参数时的默认值；未配置且无 URL 值时不追加 */
  urlQueryParamDefault?: string

  // SQL
  query?: string

  // Static
  staticData?: unknown

  // Refresh
  refreshInterval?: number  // seconds, 0 = load once

  /**
   * 卡片/卡片列表「导入字段」白名单：非空时仅导入所列字段名（按列表顺序）；
   * 省略或空数组时导入样本对象的全部键。
   */
  importFieldWhitelist?: string[]
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
  /** 编辑器锁定：不可选中、拖动、改属性 */
  locked?: boolean
}

export function isComponentLocked(c: PageComponent): boolean {
  return !!c.locked
}

// ===== 页面默认尺寸 =====
export const DEFAULT_PAGE_WIDTH = 1920
export const DEFAULT_PAGE_HEIGHT = 1080

// ===== 图表文字默认样式 =====
export const DEFAULT_CHART_TEXT_FONT_SIZE = 16
export const DEFAULT_CHART_TEXT_COLOR = '#cbd5e1'

export { buildPieSeriesLayout, type PieSeriesLayout } from './pieChartLayout'
export { parseKeyValueTagKeyList, filterKeyValueTagItems } from './keyValueTag'
export {
  parseImportFieldWhitelist,
  resolveImportFieldNames,
  resolveCombinedImportFieldNames,
  resolveUrlQueryParamValue,
  appendQueryParamToUrl,
  resolveRestDataSourceUrl,
} from './dataSource'
export {
  type CardArrayFilterOperator,
  type CardArrayFilterCondition,
  CARD_ARRAY_FILTER_OPERATORS,
  resolveByPath,
  resolveCardItem,
  matchCardArrayItem,
  getActiveCardArrayFilters,
} from './cardComponent'
export {
  parseChartFilterValues,
  asChartRowArray,
  filterChartArrayRows,
} from './chartComponent'

// ===== 页面 Schema =====
import type { BgGradient } from './bgGradient'
export {
  type BgGradient,
  BG_GRADIENTS,
  pickBgGradient,
  buildGradientBackground,
  DEFAULT_GRADIENT_COLOR_TO,
} from './bgGradient'

export interface PageSchema {
  width: number
  height: number
  bgColor?: string
  /** 页面渐变暗色（终点）；仅 bgGradient !== 'none' 时生效 */
  bgColorTo?: string
  bgGradient?: BgGradient
  bgImage?: string
  bgOpacity?: number
  dataSources?: DataSource[]
  colorDict?: ColorDictEntry[]
  iconDict?: IconDictEntry[]
  /** 本页引用的已保存 SVG 快照（Renderer 离线可读） */
  savedIcons?: CustomIconRecord[]
  abbrevDict?: AbbrevDictEntry[]
  components: PageComponent[]
}

export {
  SYSTEM_PAGE_ID_MAX,
  MIN_USER_PAGE_ID,
  isSystemPageId,
} from './pagePolicy'

// ===== API 响应 =====
export interface PageRecord {
  id: number
  name: string
  schemaJson: PageSchema
  createdAt: string
}
