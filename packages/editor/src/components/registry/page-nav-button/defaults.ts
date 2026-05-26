import { DEFAULT_PAGE_NAV_BUTTON_COLORS } from '@mvp-vue/schema'

export function pageNavButtonDefaultProps() {
  return {
    label: '跳转页面',
    fontSize: 15,
    iconPreset: 'arrow-right',
    iconUrl: '',
    targetPageId: null,
    ...DEFAULT_PAGE_NAV_BUTTON_COLORS,
  }
}

export function pageNavButtonDefaultSize() {
  return { w: 220, h: 52 }
}
