export type BgGradient = 'none' | 'linear-top' | 'linear-left' | 'linear-diagonal' | 'radial'

export const BG_GRADIENTS: readonly BgGradient[] = [
  'none',
  'linear-top',
  'linear-left',
  'linear-diagonal',
  'radial',
] as const

export function pickBgGradient(v: unknown): BgGradient | undefined {
  if (typeof v === 'string' && (BG_GRADIENTS as readonly string[]).includes(v)) {
    return v as BgGradient
  }
  return undefined
}

/** 未配置终点色时的默认暗色（与 React 版页面背景渐变终点一致） */
export const DEFAULT_GRADIENT_COLOR_TO = 'rgba(0, 0, 0, 0.35)'

/** 由起止色 + 渐变模式生成 CSS background 值（纯色或渐变） */
export function buildGradientBackground(
  from: string,
  gradient: BgGradient,
  to: string = DEFAULT_GRADIENT_COLOR_TO,
): string {
  switch (gradient) {
    case 'linear-top':
      return `linear-gradient(180deg, ${from}, ${to})`
    case 'linear-left':
      return `linear-gradient(90deg, ${from}, ${to})`
    case 'linear-diagonal':
      return `linear-gradient(135deg, ${from}, ${to})`
    case 'radial':
      return `radial-gradient(circle at 50% 50%, ${from}, ${to})`
    default:
      return from
  }
}
