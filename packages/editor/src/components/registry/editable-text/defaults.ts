export function editableTextDefaultProps() {
  return {
    rowKey: '',
    fontSize: 20,
    fontFamily: 'sans-serif',
    fontWeight: 'normal' as const,
    color: '#ffffff',
    backgroundColor: 'transparent',
  }
}

export function editableTextDefaultSize() {
  return { w: 280, h: 64 }
}
