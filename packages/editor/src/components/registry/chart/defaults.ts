import { DEFAULT_CHART_TEXT_FONT_SIZE, DEFAULT_CHART_TEXT_COLOR } from '@mvp-vue/schema'

export function chartDefaultProps() {
  return {
    title: '图表',
    textFontSize: DEFAULT_CHART_TEXT_FONT_SIZE,
    textColor: DEFAULT_CHART_TEXT_COLOR,
  }
}

export function chartDefaultSize() {
  return { w: 500, h: 350 }
}
