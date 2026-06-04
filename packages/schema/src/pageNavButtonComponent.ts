import type { IconDictEntry, PageNavIconPreset } from './index'
import {
  buildGradientBackground,
  DEFAULT_GRADIENT_COLOR_TO,
  pickBgGradient,
  type BgGradient,
} from './bgGradient'

/** 与 index.ts 中 PAGE_NAV_ICON_PRESETS 保持一致（勿从 index 运行时导入，避免循环依赖） */
const PAGE_NAV_ICON_PRESET_VALUES: readonly PageNavIconPreset[] = [
  'arrow-right',
  'home',
  'layout-grid',
  'bar-chart',
  'external-link',
  'none',
]

/** 图标相对按钮文字的位置 */
export type PageNavIconPosition = 'left' | 'right' | 'top' | 'bottom'

export const PAGE_NAV_ICON_POSITION_OPTIONS: { value: PageNavIconPosition; label: string }[] = [
  { value: 'left', label: '图标在左' },
  { value: 'right', label: '图标在右' },
  { value: 'top', label: '图标在上' },
  { value: 'bottom', label: '图标在下' },
]

export const DEFAULT_PAGE_NAV_ICON_SIZE = 20
export const DEFAULT_PAGE_NAV_ICON_GAP = 10

/** 与 DEFAULT_PAGE_NAV_BUTTON_COLORS 一致；旧页无 bgGradient 时按对角渐变渲染 */
export const DEFAULT_PAGE_NAV_BG_GRADIENT: BgGradient = 'linear-diagonal'

export interface PageNavButtonAppearance {
  textColor: string
  borderColor: string
  glowColor: string
  /** 纯色或渐变亮色；兼容旧字段 bgColorFrom */
  backgroundColor: string
  /** 渐变暗色；兼容旧字段 bgColorTo */
  backgroundColorTo: string
  backgroundGradient: BgGradient
}

const DEFAULT_APPEARANCE: PageNavButtonAppearance = {
  textColor: '#e2e8f0',
  borderColor: 'rgba(129, 140, 248, 0.45)',
  glowColor: 'rgba(99, 102, 241, 0.28)',
  backgroundColor: 'rgba(99, 102, 241, 0.35)',
  backgroundColorTo: 'rgba(15, 23, 42, 0.92)',
  backgroundGradient: DEFAULT_PAGE_NAV_BG_GRADIENT,
}

function pickColor(props: Record<string, unknown>, keys: string[], fallback: string): string {
  for (const key of keys) {
    const v = props[key]
    if (typeof v === 'string' && v.trim()) return v
  }
  return fallback
}

/** 解析按钮配色与背景（与矩形组件相同的渐变模式） */
export function resolvePageNavButtonAppearance(props: Record<string, unknown>): PageNavButtonAppearance {
  const gradient =
    pickBgGradient(props.backgroundGradient) ??
    pickBgGradient(props.bgGradient) ??
    DEFAULT_PAGE_NAV_BG_GRADIENT
  return {
    textColor: pickColor(props, ['textColor'], DEFAULT_APPEARANCE.textColor),
    borderColor: pickColor(props, ['borderColor'], DEFAULT_APPEARANCE.borderColor),
    glowColor: pickColor(props, ['glowColor'], DEFAULT_APPEARANCE.glowColor),
    backgroundColor: pickColor(
      props,
      ['backgroundColor', 'bgColorFrom'],
      DEFAULT_APPEARANCE.backgroundColor,
    ),
    backgroundColorTo: pickColor(
      props,
      ['backgroundColorTo', 'bgColorTo'],
      DEFAULT_APPEARANCE.backgroundColorTo,
    ),
    backgroundGradient: gradient,
  }
}

/** 按钮背景 CSS（纯色 backgroundColor 或 buildGradientBackground） */
export function resolvePageNavButtonBackgroundStyle(
  props: Record<string, unknown>,
): Record<string, string> {
  const a = resolvePageNavButtonAppearance(props)
  if (a.backgroundGradient === 'none') {
    return { backgroundColor: a.backgroundColor }
  }
  return {
    background: buildGradientBackground(
      a.backgroundColor,
      a.backgroundGradient,
      a.backgroundColorTo || DEFAULT_GRADIENT_COLOR_TO,
    ),
  }
}

const PRESET_SET = new Set<string>(PAGE_NAV_ICON_PRESET_VALUES)

export function isPageNavImageUrl(value: string): boolean {
  return /^(https?:|data:|\/)/i.test(value.trim())
}

/** IconPicker / 字典式图标配置 → 与 Icon 组件同形 */
export function pageNavPropsToIconEntry(props: Record<string, unknown>): IconDictEntry | null {
  const iconType = props.iconType as IconDictEntry['iconType'] | undefined
  if (iconType === 'preset' && props.iconName) {
    return { id: '', key: '', iconType: 'preset', iconName: String(props.iconName) }
  }
  if (iconType === 'custom' && props.iconSvg) {
    return { id: '', key: '', iconType: 'custom', iconSvg: String(props.iconSvg) }
  }
  if (iconType === 'saved' && props.savedIconId != null) {
    const id = Number(props.savedIconId)
    if (Number.isFinite(id)) return { id: '', key: '', iconType: 'saved', savedIconId: id }
  }
  return null
}

export function pageNavIconPickerToProps(entry: IconDictEntry): Record<string, unknown> {
  return {
    iconType: entry.iconType,
    iconName: entry.iconName,
    iconSvg: entry.iconSvg,
    savedIconId: entry.savedIconId,
    iconPreset: 'none',
    iconUrl: '',
  }
}

export function resolvePageNavBuiltinPreset(props: Record<string, unknown>): PageNavIconPreset {
  const raw = String(props.iconPreset ?? 'arrow-right')
  return (PRESET_SET.has(raw) ? raw : 'arrow-right') as PageNavIconPreset
}

export function resolvePageNavIconSize(props: Record<string, unknown>): number {
  const n = Number(props.iconSize)
  if (!Number.isFinite(n)) return DEFAULT_PAGE_NAV_ICON_SIZE
  return Math.min(64, Math.max(8, Math.round(n)))
}

export function resolvePageNavIconGap(props: Record<string, unknown>): number {
  const n = Number(props.iconGap)
  if (!Number.isFinite(n)) return DEFAULT_PAGE_NAV_ICON_GAP
  return Math.min(48, Math.max(0, Math.round(n)))
}

export function resolvePageNavIconPosition(props: Record<string, unknown>): PageNavIconPosition {
  const p = props.iconPosition as PageNavIconPosition | undefined
  return PAGE_NAV_ICON_POSITION_OPTIONS.some((o) => o.value === p) ? p! : 'left'
}

export function resolvePageNavIconColor(props: Record<string, unknown>, textColor: string): string {
  const c = String(props.iconColor ?? '').trim()
  return c || textColor
}

/** 图标 + 文字容器 flex 方向（DOM 顺序固定为：图标 → 文字） */
export function pageNavContentFlexStyle(
  position: PageNavIconPosition,
  gapPx: number,
): Record<string, string> {
  const gap = `${gapPx}px`
  switch (position) {
    case 'right':
      return {
        display: 'flex',
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap,
        minWidth: '0',
      }
    case 'top':
      return {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap,
        minWidth: '0',
      }
    case 'bottom':
      return {
        display: 'flex',
        flexDirection: 'column-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap,
        minWidth: '0',
      }
    case 'left':
    default:
      return {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap,
        minWidth: '0',
      }
  }
}

export type PageNavIconDisplay =
  | { kind: 'none' }
  | { kind: 'dict'; entry: IconDictEntry }
  | { kind: 'url'; url: string }
  | { kind: 'builtin'; preset: PageNavIconPreset }

export function resolvePageNavIconDisplay(props: Record<string, unknown>): PageNavIconDisplay {
  const dict = pageNavPropsToIconEntry(props)
  if (dict) return { kind: 'dict', entry: dict }

  const url = String(props.iconUrl ?? '').trim()
  if (url && isPageNavImageUrl(url)) return { kind: 'url', url }

  const preset = resolvePageNavBuiltinPreset(props)
  if (preset === 'none') return { kind: 'none' }
  return { kind: 'builtin', preset }
}
