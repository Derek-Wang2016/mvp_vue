/** 与 DEFAULT_CHART_TEXT_FONT_SIZE 保持一致 */
const CHART_TEXT_FONT_SIZE_BASE = 16

export interface PieSeriesLayout {
  radius: [string, string]
  center: [string, string]
  labelLine: { length: number; length2: number }
  labelMaxWidth: number
}

/** 按字号与组件尺寸为饼图外侧标签预留空间（editor / renderer 共用） */
export function buildPieSeriesLayout(
  compW: number,
  compH: number,
  fontSize: number,
  hasTitle: boolean,
): PieSeriesLayout {
  const minDim = Math.max(120, Math.min(compW, compH))
  const fontShrink = Math.max(0, (fontSize - CHART_TEXT_FONT_SIZE_BASE) * (200 / minDim))
  const sizeShrink = minDim < 300 ? 6 : minDim < 400 ? 3 : 0
  const outerPct = Math.max(38, 58 - fontShrink - sizeShrink)
  const innerPct = Math.max(20, outerPct - 26)

  return {
    radius: [`${Math.round(innerPct)}%`, `${Math.round(outerPct)}%`],
    center: ['50%', hasTitle ? '52%' : '50%'],
    labelLine: {
      length: Math.min(16, 8 + fontSize * 0.12),
      length2: Math.min(10, 4 + fontSize * 0.08),
    },
    labelMaxWidth: Math.floor(minDim * 0.28),
  }
}
