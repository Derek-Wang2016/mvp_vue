import { resolveIcon } from './icons/lvglSvg'
import { lvglSymbolName } from './icons/lvglSymbols'
import { currentPage, FONT_PX, LIMITS, type HmiCard, type HmiDocument, type HmiItem, type HmiPage, type HmiShape } from './types'

export function fontPx(name: string | undefined, fallback = 28): number {
  if (!name) return fallback
  if (FONT_PX[name] != null) return FONT_PX[name]
  const n = Number(name)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function sampleValue(doc: HmiDocument, prop: string | undefined): unknown {
  if (!prop) return ''
  if (prop === 'CLOCK') return formatClock(new Date())
  return doc.sample[prop] ?? ''
}

export function formatClock(date: Date, format?: string): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const week = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const pattern = format && format.length > 0 ? format : '%Y年%m月%d日 %H:%M:%S %A'
  return pattern.replace(/%Y|%m|%d|%H|%M|%S|%A/g, (token) => {
    if (token === '%Y') return String(date.getFullYear())
    if (token === '%m') return pad(date.getMonth() + 1)
    if (token === '%d') return pad(date.getDate())
    if (token === '%H') return pad(date.getHours())
    if (token === '%M') return pad(date.getMinutes())
    if (token === '%S') return pad(date.getSeconds())
    return week[date.getDay()] ?? ''
  })
}

/** 按字符遮罩。未配置符号时原样返回。下标从 1 开始，缺省遮第 2 个字符。 */
export function applyMask(text: string, symbol?: string, at?: number, count?: number): string {
  const mark = (symbol ?? '').trim()
  if (!mark) return text
  const chars = Array.from(text)
  const start = Math.max(0, (at != null && at > 0 ? Math.floor(at) : 2) - 1)
  const n = Math.max(1, count != null && count > 0 ? Math.floor(count) : 1)
  if (start >= chars.length) return text
  const end = Math.min(chars.length, start + n)
  for (let i = start; i < end; i++) chars[i] = mark
  return chars.join('')
}

export function textAlign(align: HmiItem['align']): 'left' | 'center' | 'right' {
  if (align === 'start') return 'left'
  if (align === 'end') return 'right'
  return 'center'
}

/** 大于 0 的轨道用指定像素。列宽合计正好为 12 时，按 12 份把卡片宽度等分。其余未指定的轨道平分剩余空间。 */
export function trackSizes(total: number, count: number, gap: number, specified?: number[]): number[] {
  const n = Math.max(1, count)
  const specs = Array.from({ length: n }, (_, i) => {
    const value = specified?.[i]
    return value != null && value > 0 ? value : 0
  })
  const fixed = specs.reduce((sum, value) => sum + value, 0)
  const flexCount = specs.filter((value) => value <= 0).length
  const gaps = Math.max(0, n - 1) * gap
  if (flexCount === 0 && fixed === LIMITS.cols) {
    const inner = Math.max(0, total - gaps)
    return specs.map((value) => (inner * value) / LIMITS.cols)
  }
  const rest = Math.max(0, total - fixed - gaps)
  const each = flexCount > 0 ? rest / flexCount : 0
  return specs.map((value) => (value > 0 ? value : each))
}

function spanLength(tracks: number[], start: number, span: number, gap: number) {
  const slice = tracks.slice(Math.max(0, start), Math.max(0, start) + Math.max(1, span))
  if (slice.length === 0) return 0
  return slice.reduce((sum, value) => sum + value, 0) + gap * (slice.length - 1)
}

/** 二维码边长取所在格子短边的 90%，避免贴满格子。 */
export function qrSide(card: HmiCard, item: HmiItem): number {
  const cols = Math.min(LIMITS.cols, Math.max(1, card.cols ?? (card.col_w?.length || 1)))
  const rows = Math.min(LIMITS.tracks, Math.max(1, card.rows ?? (card.row_h?.length || 1)))
  const gap = card.gap ?? 0
  const width = spanLength(trackSizes(card.w, cols, gap, card.col_w), item.col ?? 0, item.colspan ?? 1, gap)
  const height = spanLength(trackSizes(card.h, rows, gap, card.row_h), item.row ?? 0, item.rowspan ?? 1, gap)
  return Math.max(16, Math.round(Math.min(width, height) * 0.9))
}

/** 病人接口用 COLORRED/GREEN/BLUE 表示当前护理等级的颜色。 */
export function careColorFromPatient(row: Record<string, unknown>): { name: string; color: string } | null {
  const name = String(row.TEND_NAME ?? '').trim()
  const channels = [row.COLORRED, row.COLORGREEN, row.COLORBLUE].map((value) => Number(value))
  if (!name || channels.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null
  const hex = channels.map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase()
  return { name, color: `#${hex}` }
}

export function withCareColor(colors: Record<string, string>, row: Record<string, unknown>): Record<string, string> {
  const care = careColorFromPatient(row)
  if (!care) return colors
  return { ...colors, [care.name]: care.color }
}

/** `#RRGGBB` 原样使用。`color.字段` 用样例里该字段的文本查颜色字典。 */
export function paintColor(
  expr: string | undefined,
  doc: { sample: Record<string, unknown>; colors?: Record<string, string> },
  fallback = '',
): string {
  const text = expr?.trim() ?? ''
  if (!text) return fallback
  const ref = /^color\.([A-Za-z_][A-Za-z0-9_]*)$/.exec(text)
  if (!ref) return text
  const key = String(doc.sample[ref[1]!] ?? '').trim()
  return doc.colors?.[key]?.trim() || fallback
}

export function lookupColor(colors: Record<string, string> | undefined, key: string, fallback = '#7C7C7C'): string {
  const value = colors?.[key]?.trim()
  return value || fallback
}

export function iconId(entry: unknown): string {
  if (typeof entry === 'string') return entry
  if (entry && typeof entry === 'object' && 'icon' in entry && typeof entry.icon === 'string') return entry.icon
  return ''
}

export function exportIcons(icons: Record<string, string> | undefined, docLibrary?: Record<string, string>): Record<string, { svg: string }> {
  const out: Record<string, { svg: string }> = {}
  for (const [label, entry] of Object.entries(icons ?? {})) {
    const svg = resolveIcon(typeof entry === 'string' ? entry : iconId(entry), docLibrary)
    if (!svg) continue
    out[label] = { svg }
  }
  return out
}

function exportParams(text: string | undefined): unknown {
  const raw = text?.trim()
  if (!raw) return undefined
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return undefined
  }
}

function exportShape(shape: HmiShape, docLibrary?: Record<string, string>): Record<string, unknown> {
  if (shape.type === 'block') {
    return {
      type: 'block',
      x: shape.x,
      y: shape.y,
      w: shape.w,
      h: shape.h,
      bg: shape.bg,
      color: shape.color,
      font: shape.font,
      radius: shape.radius,
      border_w: shape.border_w,
      border_color: shape.border_color,
      shadow: (shape.shadow?.width ?? 0) > 0 ? shape.shadow : undefined,
      key: shape.key,
      params: exportParams(shape.params),
    }
  }
  if (shape.type === 'button') {
    const svg = resolveIcon(shape.icon, docLibrary)
    return {
      type: 'button',
      x: shape.x,
      y: shape.y,
      w: shape.w,
      h: shape.h,
      text: shape.text ?? '',
      svg: svg || undefined,
      symbol: lvglSymbolName(shape.symbol) || undefined,
      color: shape.color,
      font: shape.font,
      icon_pos: shape.icon_pos === 'right' || shape.icon_pos === 'top' || shape.icon_pos === 'bottom' ? shape.icon_pos : 'left',
      bg: shape.bg,
      radius: shape.radius,
      border_w: shape.border_w,
      border_color: shape.border_color,
      shadow: (shape.shadow?.width ?? 0) > 0 ? shape.shadow : undefined,
      action: shape.action,
      page: shape.action === 'page' ? shape.page : undefined,
      key: shape.action === 'function' ? shape.key : undefined,
    }
  }
  if (shape.type === 'image') {
    const next: Record<string, unknown> = { ...shape }
    const opa = Number(shape.opa)
    if (!Number.isFinite(opa) || opa >= 100) delete next.opa
    else next.opa = Math.max(0, Math.min(100, Math.round(opa)))
    return next
  }
  if (shape.type !== 'icon' || shape.mode !== 'static') return { ...shape }
  const svg = resolveIcon(shape.icon, docLibrary)
  return {
    type: 'icon',
    x: shape.x,
    y: shape.y,
    w: shape.w,
    h: shape.h,
    svg,
    color: shape.color || '#FFFFFF',
  }
}

function exportItem(item: HmiItem, card: HmiCard): Record<string, unknown> {
  const next: Record<string, unknown> = { ...item }
  delete next.colors
  delete next.icons
  delete next.icon
  delete next.icon_size
  if (item.type === 'qrcode') next.size = qrSide(card, item)
  if (!String(next.mask ?? '').trim()) {
    delete next.mask
    delete next.mask_at
    delete next.mask_n
  }
  return next
}

function omitEmpty<T extends Record<string, unknown>>(input: T): T {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (key === 'locked' || value == null || value === '') continue
    out[key] = value
  }
  return out as T
}

function exportPage(page: HmiPage, library?: Record<string, string>) {
  return omitEmpty({
    bg: page.bg,
    bgImage: page.bgImage,
    bgOpa: page.bgOpa,
    shapes: page.shapes.map((shape) => omitEmpty(exportShape(shape, library))),
    cards: page.cards.map((card) => omitEmpty({
      ...card,
      items: card.items.map((item) => omitEmpty(exportItem(item, card))),
    })),
  })
}

export function deviceJson(doc: HmiDocument) {
  const names = ['index', ...Object.keys(doc.pages).filter((name) => name !== 'index')]
  const pages: Record<string, ReturnType<typeof exportPage>> = {}
  for (const name of names) {
    const page = doc.pages[name]
    if (page) pages[name] = exportPage(page, doc.library)
  }
  return {
    version: 3 as const,
    screen: doc.screen,
    colors: doc.colors ?? {},
    icons: exportIcons(doc.icons, doc.library),
    pages,
  }
}

export function bindingCount(doc: HmiDocument): number {
  const page = currentPage(doc)
  const icons = page.shapes.filter((shape) => shape.type === 'icon' && shape.mode !== 'static' && shape.prop).length
  return icons + page.cards.reduce((sum, card) => sum + card.items.filter((item) => {
    if (item.type === 'qrcode' || item.type === 'split') return true
    return item.type === 'value' && item.prop !== 'CLOCK'
  }).length, 0)
}
