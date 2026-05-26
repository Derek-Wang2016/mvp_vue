export function tableDefaultProps() {
  return {
    rows: 5,
    cols: 5,
    outerBorderWidth: 2,
    innerBorderWidth: 1,
    outerBorderColor: 'transparent',
    innerBorderColor: '#1e293b',
    edgeBorderColor: '#334155',
    headerColor: 'rgba(30,41,59,0.6)',
    headerHeight: 32,
    rowHeight: 28,
    cellData: [] as string[][],
    headerFontSize: 32,
    cellFontSize: 32,
  }
}

export function tableDefaultSize() {
  return { w: 600, h: 400 }
}
