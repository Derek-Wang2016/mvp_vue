export function textDefaultProps() {
  return {
    content: '双击编辑文本',
    fontSize: 20,
    fontFamily: 'sans-serif',
    color: '#ffffff',
    textDirection: 'horizontal' as const,
    letterSpacing: 0,
  }
}

export function textDefaultSize() {
  return { w: 240, h: 60 }
}
