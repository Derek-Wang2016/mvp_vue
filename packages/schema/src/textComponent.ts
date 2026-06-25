export type TextDirection = 'horizontal' | 'vertical'

export function getTextDirection(props: Record<string, unknown>): TextDirection {
  return props.textDirection === 'vertical' ? 'vertical' : 'horizontal'
}

export function getTextLetterSpacing(props: Record<string, unknown>): number {
  const n = Number(props.letterSpacing)
  return Number.isFinite(n) ? n : 0
}

/** 文本组件排版样式（方向 + 字间距）；横向为 letter-spacing，纵向 writing-mode 下为字符纵向间距 */
export function buildTextComponentStyle(
  props: Record<string, unknown>,
  extra?: Record<string, string | undefined>,
): Record<string, string> {
  const direction = getTextDirection(props)
  const spacing = getTextLetterSpacing(props)

  const style: Record<string, string> = {
    fontSize: `${(props.fontSize as number) ?? 20}px`,
    fontFamily: (props.fontFamily as string) ?? 'sans-serif',
    fontWeight: (props.fontWeight as string) ?? 'normal',
    color: (props.color as string) ?? '#fff',
    whiteSpace: 'pre-wrap',
    ...extra,
  }

  if (direction === 'vertical') {
    style.writingMode = 'vertical-rl'
    style.textOrientation = 'upright'
  }

  if (spacing !== 0) {
    style.letterSpacing = `${spacing}px`
  }

  return style
}
