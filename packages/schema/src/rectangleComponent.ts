/** 矩形组件 — 默认 props 与渲染样式 */

import {
  buildGradientBackground,
  DEFAULT_GRADIENT_COLOR_TO,
  pickBgGradient,
  type BgGradient,
} from './bgGradient'

export interface RectangleComponentProps {
  /** 无渐变时为纯色；有渐变时为渐变亮色（起点） */
  backgroundColor: string
  /** 渐变暗色（终点）；仅 backgroundGradient !== 'none' 时生效 */
  backgroundColorTo: string
  backgroundGradient: BgGradient
  borderColor: string
  borderWidth: number
  borderRadius: number
  /** 是否绘制边框；为 false 时忽略 borderWidth */
  borderEnabled: boolean
  /** 整体不透明度 0–1 */
  opacity: number
}

export const DEFAULT_RECTANGLE_PROPS: RectangleComponentProps = {
  backgroundColor: 'rgba(30, 41, 59, 0.85)',
  backgroundColorTo: DEFAULT_GRADIENT_COLOR_TO,
  backgroundGradient: 'none',
  borderColor: 'rgba(129, 140, 248, 0.55)',
  borderWidth: 2,
  borderRadius: 8,
  borderEnabled: true,
  opacity: 1,
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function num(props: Record<string, unknown>, key: keyof RectangleComponentProps, fallback: number): number {
  const v = props[key]
  if (typeof v === 'number' && Number.isFinite(v)) return v
  return fallback
}

function bool(props: Record<string, unknown>, key: keyof RectangleComponentProps, fallback: boolean): boolean {
  const v = props[key]
  if (typeof v === 'boolean') return v
  return fallback
}

function str(props: Record<string, unknown>, key: keyof RectangleComponentProps, fallback: string): string {
  const v = props[key]
  if (typeof v === 'string' && v.length > 0) return v
  return fallback
}

/** 解析矩形 props，供编辑器预览与渲染器共用 */
export function resolveRectangleProps(props: Record<string, unknown>): RectangleComponentProps {
  return {
    backgroundColor: str(props, 'backgroundColor', DEFAULT_RECTANGLE_PROPS.backgroundColor),
    backgroundColorTo: str(props, 'backgroundColorTo', DEFAULT_RECTANGLE_PROPS.backgroundColorTo),
    backgroundGradient:
      pickBgGradient(props.backgroundGradient) ?? DEFAULT_RECTANGLE_PROPS.backgroundGradient,
    borderColor: str(props, 'borderColor', DEFAULT_RECTANGLE_PROPS.borderColor),
    borderWidth: clamp(num(props, 'borderWidth', DEFAULT_RECTANGLE_PROPS.borderWidth), 0, 64),
    borderRadius: clamp(num(props, 'borderRadius', DEFAULT_RECTANGLE_PROPS.borderRadius), 0, 999),
    borderEnabled: bool(props, 'borderEnabled', DEFAULT_RECTANGLE_PROPS.borderEnabled),
    opacity: clamp(num(props, 'opacity', DEFAULT_RECTANGLE_PROPS.opacity), 0, 1),
  }
}

export type RectangleInlineStyle = Record<string, string | number>

export function resolveRectangleStyle(props: Record<string, unknown>): RectangleInlineStyle {
  const r = resolveRectangleProps(props)
  const borderWidth = r.borderEnabled ? r.borderWidth : 0
  const background = buildGradientBackground(
    r.backgroundColor,
    r.backgroundGradient,
    r.backgroundColorTo,
  )
  const style: RectangleInlineStyle = {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    borderRadius: `${r.borderRadius}px`,
    border: borderWidth > 0 ? `${borderWidth}px solid ${r.borderColor}` : 'none',
    opacity: r.opacity,
  }
  if (r.backgroundGradient === 'none') {
    style.backgroundColor = r.backgroundColor
  } else {
    style.background = background
  }
  return style
}
