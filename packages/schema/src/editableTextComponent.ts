import { buildTextComponentStyle } from './textComponent'

export type EditableTextAlign = 'left' | 'center' | 'right'
export type EditableTextVerticalAlign = 'top' | 'middle' | 'bottom'

export function getEditableTextAlign(props: Record<string, unknown>): EditableTextAlign {
  return props.textAlign === 'center' || props.textAlign === 'right' ? props.textAlign : 'left'
}

export function getEditableTextVerticalAlign(props: Record<string, unknown>): EditableTextVerticalAlign {
  return props.verticalAlign === 'middle' || props.verticalAlign === 'bottom' ? props.verticalAlign : 'top'
}

/** 可编辑文本的盒子样式：字体 + 背景 + 边框 + 圆角 + 水平/垂直对齐 */
export function buildEditableTextBoxStyle(props: Record<string, unknown>): Record<string, string> {
  const borderWidth = Math.max(0, Number(props.borderWidth) || 0)
  const borderRadius = Math.max(0, Number(props.borderRadius) || 0)
  const align = getEditableTextAlign(props)
  const vertical = getEditableTextVerticalAlign(props)
  return {
    ...buildTextComponentStyle(props),
    backgroundColor: (props.backgroundColor as string) || 'transparent',
    boxSizing: 'border-box',
    borderStyle: borderWidth > 0 ? 'solid' : 'none',
    borderWidth: `${borderWidth}px`,
    borderColor: (props.borderColor as string) || '#ffffff',
    borderRadius: `${borderRadius}px`,
    display: 'flex',
    alignItems: vertical === 'middle' ? 'center' : vertical === 'bottom' ? 'flex-end' : 'flex-start',
    textAlign: align,
    overflow: 'hidden',
    padding: '4px 8px',
  }
}
