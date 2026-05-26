import type { PageNavIconPreset } from '@mvp-vue/schema'

export const PROP_LABEL = 'text-[11px] font-medium text-slate-300 uppercase tracking-wider'
export const PROP_HINT = 'text-[11px] text-slate-400'
export const PROP_SECTION = 'text-[11px] font-medium text-slate-400 uppercase tracking-wider'
export const PROP_INPUT =
  'w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors'
export const PROP_NUMBER_INNER =
  'w-full bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors'
export const PROP_NUMBER_WRAP = 'w-full mt-1'
export const PROP_NUMBER_INNER_COMPACT =
  'w-full bg-white/[0.08] border border-white/15 rounded-md px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors'
export const PROP_NUMBER_WRAP_COMPACT = 'w-full mt-0.5'
export const PROP_SELECT_COMPACT =
  'editor-select w-full mt-0.5 bg-[#0f172a] border border-white/15 rounded px-2 py-1.5 text-xs text-slate-100 focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors'

export const PAGE_NAV_ICON_LABELS: Record<PageNavIconPreset, string> = {
  'arrow-right': '箭头',
  home: '首页',
  'layout-grid': '网格',
  'bar-chart': '图表',
  'external-link': '外链',
  none: '无图标',
}

export function parseColor(css: string): { r: number; g: number; b: number; a: number } {
  if (!css || css === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
  const rgba = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (rgba?.[1] && rgba?.[2] && rgba?.[3]) return { r: +rgba[1], g: +rgba[2], b: +rgba[3], a: rgba[4] ? +rgba[4] : 1 }
  const hex8 = css.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (hex8?.[1] && hex8?.[2] && hex8?.[3] && hex8?.[4]) return { r: parseInt(hex8[1], 16), g: parseInt(hex8[2], 16), b: parseInt(hex8[3], 16), a: Math.round(parseInt(hex8[4], 16) / 255 * 100) / 100 }
  const hex6 = css.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (hex6?.[1] && hex6?.[2] && hex6?.[3]) return { r: parseInt(hex6[1], 16), g: parseInt(hex6[2], 16), b: parseInt(hex6[3], 16), a: 1 }
  const hex3 = css.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i)
  if (hex3?.[1] && hex3?.[2] && hex3?.[3]) return { r: parseInt(hex3[1] + hex3[1], 16), g: parseInt(hex3[2] + hex3[2], 16), b: parseInt(hex3[3] + hex3[3], 16), a: 1 }
  return { r: 0, g: 0, b: 0, a: 1 }
}

export function toRgba(r: number, g: number, b: number, a: number): string {
  return a === 1
    ? `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
    : `rgba(${r},${g},${b},${a})`
}
