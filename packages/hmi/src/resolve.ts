import { resolveIcon } from './icons/lvglSvg'
import { FONT_PX, type HmiDocument, type HmiItem } from './types'

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

export function textAlign(align: HmiItem['align']): 'left' | 'center' | 'right' {
  if (align === 'start') return 'left'
  if (align === 'end') return 'right'
  return 'center'
}

/** 大于 0 的轨道用指定像素，其余平分去掉间距后的剩余空间。 */
export function trackSizes(total: number, count: number, gap: number, specified?: number[]): number[] {
  const n = Math.max(1, count)
  const specs = Array.from({ length: n }, (_, i) => {
    const value = specified?.[i]
    return value != null && value > 0 ? value : 0
  })
  const fixed = specs.reduce((sum, value) => sum + value, 0)
  const flexCount = specs.filter((value) => value <= 0).length
  const rest = Math.max(0, total - fixed - Math.max(0, n - 1) * gap)
  const each = flexCount > 0 ? rest / flexCount : 0
  return specs.map((value) => (value > 0 ? value : each))
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

function exportShape(shape: HmiDocument['shapes'][number], docLibrary?: Record<string, string>): Record<string, unknown> {
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

function exportItem(item: HmiItem): Record<string, unknown> {
  const next: Record<string, unknown> = { ...item }
  delete next.colors
  delete next.icons
  delete next.icon
  delete next.icon_size
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

export function deviceJson(doc: HmiDocument) {
  return {
    version: 2 as const,
    colors: doc.colors ?? {},
    icons: exportIcons(doc.icons, doc.library),
    shapes: doc.shapes.map((shape) => omitEmpty(exportShape(shape, doc.library))),
    cards: doc.cards.map((card) => omitEmpty({
      ...card,
      items: card.items.map((item) => omitEmpty(exportItem(item))),
    })),
  }
}

export function bindingCount(doc: HmiDocument): number {
  const icons = doc.shapes.filter((shape) => shape.type === 'icon' && shape.mode !== 'static' && shape.prop).length
  return icons + doc.cards.reduce((sum, card) => sum + card.items.filter((item) => {
    if (item.type === 'qrcode' || item.type === 'split') return true
    return item.type === 'value' && item.prop !== 'CLOCK'
  }).length, 0)
}
