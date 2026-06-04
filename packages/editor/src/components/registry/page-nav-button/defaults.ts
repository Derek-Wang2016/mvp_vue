import {
  DEFAULT_PAGE_NAV_BUTTON_COLORS,
  DEFAULT_PAGE_NAV_BG_GRADIENT,
  DEFAULT_PAGE_NAV_ICON_GAP,
  DEFAULT_PAGE_NAV_ICON_SIZE,
} from '@mvp-vue/schema'

export function pageNavButtonDefaultProps() {
  return {
    label: '跳转页面',
    fontSize: 15,
    iconPreset: 'arrow-right',
    iconUrl: '',
    iconPosition: 'left',
    iconGap: DEFAULT_PAGE_NAV_ICON_GAP,
    iconSize: DEFAULT_PAGE_NAV_ICON_SIZE,
    iconColor: '',
    targetPageId: null,
    bgGradient: DEFAULT_PAGE_NAV_BG_GRADIENT,
    ...DEFAULT_PAGE_NAV_BUTTON_COLORS,
  }
}

export function pageNavButtonDefaultSize() {
  return { w: 220, h: 52 }
}
