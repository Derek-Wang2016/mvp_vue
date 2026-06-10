/** 圆形/椭圆组件 — 外接矩形内切椭圆，宽高相等时为正圆 */

export interface EllipseComponentProps {
  backgroundColor: string
  borderColor: string
  borderWidth: number
}

export const DEFAULT_ELLIPSE_PROPS: EllipseComponentProps = {
  backgroundColor: 'rgba(30, 41, 59, 0.85)',
  borderColor: 'rgba(129, 140, 248, 0.55)',
  borderWidth: 2,
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function num(props: Record<string, unknown>, key: keyof EllipseComponentProps, fallback: number): number {
  const v = props[key]
  if (typeof v === 'number' && Number.isFinite(v)) return v
  return fallback
}

function str(props: Record<string, unknown>, key: keyof EllipseComponentProps, fallback: string): string {
  const v = props[key]
  if (typeof v === 'string' && v.length > 0) return v
  return fallback
}

export function resolveEllipseProps(props: Record<string, unknown>): EllipseComponentProps {
  return {
    backgroundColor: str(props, 'backgroundColor', DEFAULT_ELLIPSE_PROPS.backgroundColor),
    borderColor: str(props, 'borderColor', DEFAULT_ELLIPSE_PROPS.borderColor),
    borderWidth: clamp(num(props, 'borderWidth', DEFAULT_ELLIPSE_PROPS.borderWidth), 0, 64),
  }
}

export type EllipseInlineStyle = Record<string, string | number>

/** 解析椭圆内联样式，供编辑器预览与渲染器共用 */
export function resolveEllipseStyle(props: Record<string, unknown>): EllipseInlineStyle {
  const e = resolveEllipseProps(props)
  return {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    borderRadius: '50%',
    backgroundColor: e.backgroundColor,
    border: e.borderWidth > 0 ? `${e.borderWidth}px solid ${e.borderColor}` : 'none',
  }
}
