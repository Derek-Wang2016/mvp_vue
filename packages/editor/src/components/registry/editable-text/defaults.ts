export function editableTextDefaultProps() {
  return {
    rowKey: '',
    fontSize: 20,
    fontFamily: 'sans-serif',
    fontWeight: 'normal' as const,
    color: '#ffffff',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: '#ffffff',
    borderRadius: 0,
    textAlign: 'left' as const,
    verticalAlign: 'top' as const,
  }
}

export function editableTextDefaultSize() {
  return { w: 280, h: 64 }
}
