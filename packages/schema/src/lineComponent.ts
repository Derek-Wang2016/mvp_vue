/** 线条组件 — 默认 props 与 SVG 线段解析 */

export type LineOrientation = 'horizontal' | 'vertical' | 'diagonal-forward' | 'diagonal-backward'

export type LineStrokeStyle = 'solid' | 'dashed' | 'dotted'

export type LineCap = 'butt' | 'round' | 'square'

export interface LineComponentProps {
  strokeColor: string
  strokeWidth: number
  strokeStyle: LineStrokeStyle
  lineCap: LineCap
  orientation: LineOrientation
  opacity: number
}

export const LINE_ORIENTATION_OPTIONS: LineOrientation[] = [
  'horizontal',
  'vertical',
  'diagonal-forward',
  'diagonal-backward',
]

export const LINE_STROKE_STYLE_OPTIONS: LineStrokeStyle[] = ['solid', 'dashed', 'dotted']

export const LINE_CAP_OPTIONS: LineCap[] = ['butt', 'round', 'square']

export const DEFAULT_LINE_PROPS: LineComponentProps = {
  strokeColor: 'rgba(129, 140, 248, 0.9)',
  strokeWidth: 2,
  strokeStyle: 'solid',
  lineCap: 'round',
  orientation: 'horizontal',
  opacity: 1,
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function num(props: Record<string, unknown>, key: keyof LineComponentProps, fallback: number): number {
  const v = props[key]
  if (typeof v === 'number' && Number.isFinite(v)) return v
  return fallback
}

function str(props: Record<string, unknown>, key: keyof LineComponentProps, fallback: string): string {
  const v = props[key]
  if (typeof v === 'string' && v.length > 0) return v
  return fallback
}

function enumVal<T extends string>(
  props: Record<string, unknown>,
  key: keyof LineComponentProps,
  allowed: readonly T[],
  fallback: T,
): T {
  const v = props[key]
  if (typeof v === 'string' && (allowed as readonly string[]).includes(v)) return v as T
  return fallback
}

export function resolveLineProps(props: Record<string, unknown>): LineComponentProps {
  return {
    strokeColor: str(props, 'strokeColor', DEFAULT_LINE_PROPS.strokeColor),
    strokeWidth: clamp(num(props, 'strokeWidth', DEFAULT_LINE_PROPS.strokeWidth), 1, 64),
    strokeStyle: enumVal(props, 'strokeStyle', LINE_STROKE_STYLE_OPTIONS, DEFAULT_LINE_PROPS.strokeStyle),
    lineCap: enumVal(props, 'lineCap', LINE_CAP_OPTIONS, DEFAULT_LINE_PROPS.lineCap),
    orientation: enumVal(props, 'orientation', LINE_ORIENTATION_OPTIONS, DEFAULT_LINE_PROPS.orientation),
    opacity: clamp(num(props, 'opacity', DEFAULT_LINE_PROPS.opacity), 0, 1),
  }
}

export interface LineSvgEndpoints {
  x1: number
  y1: number
  x2: number
  y2: number
}

/** viewBox 0–100 内的端点，供 SVG line 使用 */
export function resolveLineEndpoints(orientation: LineOrientation): LineSvgEndpoints {
  switch (orientation) {
    case 'vertical':
      return { x1: 50, y1: 0, x2: 50, y2: 100 }
    case 'diagonal-forward':
      return { x1: 0, y1: 0, x2: 100, y2: 100 }
    case 'diagonal-backward':
      return { x1: 100, y1: 0, x2: 0, y2: 100 }
    case 'horizontal':
    default:
      return { x1: 0, y1: 50, x2: 100, y2: 50 }
  }
}

export function resolveLineStrokeDasharray(style: LineStrokeStyle, strokeWidth: number): string | undefined {
  if (style === 'solid') return undefined
  const w = Math.max(1, strokeWidth)
  if (style === 'dotted') return `${w} ${w * 1.5}`
  return `${w * 4} ${w * 2}`
}

export interface LineSvgAttrs {
  endpoints: LineSvgEndpoints
  stroke: string
  strokeWidth: number
  strokeDasharray: string | undefined
  strokeLinecap: LineCap
  opacity: number
}

export function resolveLineSvgAttrs(props: Record<string, unknown>): LineSvgAttrs {
  const line = resolveLineProps(props)
  return {
    endpoints: resolveLineEndpoints(line.orientation),
    stroke: line.strokeColor,
    strokeWidth: line.strokeWidth,
    strokeDasharray: resolveLineStrokeDasharray(line.strokeStyle, line.strokeWidth),
    strokeLinecap: line.lineCap,
    opacity: line.opacity,
  }
}
