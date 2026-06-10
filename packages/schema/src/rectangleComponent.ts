/** 矩形组件 — 默认 props 与渲染样式 */

import {
  buildGradientBackground,
  DEFAULT_GRADIENT_COLOR_TO,
  pickBgGradient,
  type BgGradient,
} from './bgGradient'

export interface RectangleCornerRadii {
  topLeft: number
  topRight: number
  bottomRight: number
  bottomLeft: number
}

export interface RectangleComponentProps {
  /** 无渐变时为纯色；有渐变时为渐变亮色（起点） */
  backgroundColor: string
  /** 渐变暗色（终点）；仅 backgroundGradient !== 'none' 时生效 */
  backgroundColorTo: string
  backgroundGradient: BgGradient
  borderColor: string
  borderWidth: number
  /** 统一圆角；四角未单独设置时作为回退值 */
  borderRadius: number
  borderRadiusTopLeft: number
  borderRadiusTopRight: number
  borderRadiusBottomRight: number
  borderRadiusBottomLeft: number
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
  borderRadiusTopLeft: 8,
  borderRadiusTopRight: 8,
  borderRadiusBottomRight: 8,
  borderRadiusBottomLeft: 8,
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

function cornerRadius(
  props: Record<string, unknown>,
  key: 'borderRadiusTopLeft' | 'borderRadiusTopRight' | 'borderRadiusBottomRight' | 'borderRadiusBottomLeft',
  fallback: number,
): number {
  const v = props[key]
  if (typeof v === 'number' && Number.isFinite(v)) return clamp(v, 0, 999)
  return fallback
}

/** 解析四角圆角；未单独配置时回退到 borderRadius */
export function resolveRectangleCornerRadii(props: Record<string, unknown>): RectangleCornerRadii {
  const fallback = clamp(num(props, 'borderRadius', DEFAULT_RECTANGLE_PROPS.borderRadius), 0, 999)
  return {
    topLeft: cornerRadius(props, 'borderRadiusTopLeft', fallback),
    topRight: cornerRadius(props, 'borderRadiusTopRight', fallback),
    bottomRight: cornerRadius(props, 'borderRadiusBottomRight', fallback),
    bottomLeft: cornerRadius(props, 'borderRadiusBottomLeft', fallback),
  }
}

export function formatRectangleBorderRadius(corners: RectangleCornerRadii): string {
  return `${corners.topLeft}px ${corners.topRight}px ${corners.bottomRight}px ${corners.bottomLeft}px`
}

/** 解析矩形 props，供编辑器预览与渲染器共用 */
export function resolveRectangleProps(props: Record<string, unknown>): RectangleComponentProps {
  const corners = resolveRectangleCornerRadii(props)
  return {
    backgroundColor: str(props, 'backgroundColor', DEFAULT_RECTANGLE_PROPS.backgroundColor),
    backgroundColorTo: str(props, 'backgroundColorTo', DEFAULT_RECTANGLE_PROPS.backgroundColorTo),
    backgroundGradient:
      pickBgGradient(props.backgroundGradient) ?? DEFAULT_RECTANGLE_PROPS.backgroundGradient,
    borderColor: str(props, 'borderColor', DEFAULT_RECTANGLE_PROPS.borderColor),
    borderWidth: clamp(num(props, 'borderWidth', DEFAULT_RECTANGLE_PROPS.borderWidth), 0, 64),
    borderRadius: clamp(num(props, 'borderRadius', DEFAULT_RECTANGLE_PROPS.borderRadius), 0, 999),
    borderRadiusTopLeft: corners.topLeft,
    borderRadiusTopRight: corners.topRight,
    borderRadiusBottomRight: corners.bottomRight,
    borderRadiusBottomLeft: corners.bottomLeft,
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
    borderRadius: formatRectangleBorderRadius({
      topLeft: r.borderRadiusTopLeft,
      topRight: r.borderRadiusTopRight,
      bottomRight: r.borderRadiusBottomRight,
      bottomLeft: r.borderRadiusBottomLeft,
    }),
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
