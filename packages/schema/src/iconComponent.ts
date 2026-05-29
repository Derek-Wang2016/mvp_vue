import type { IconDictEntry } from './index'

/** 图标组件 props → 与 IconDictEntry 同形，供 CardListIcon / IconDictEntryPreview 复用 */
export function iconPropsToDictEntry(props: Record<string, unknown>): IconDictEntry {
  const iconType = (props.iconType as IconDictEntry['iconType']) ?? 'preset'
  return {
    id: '',
    key: '',
    iconType,
    iconName: props.iconName as string | undefined,
    iconSvg: props.iconSvg as string | undefined,
    savedIconId: props.savedIconId as number | undefined,
  }
}

export function iconPickerResultToProps(entry: IconDictEntry): Record<string, unknown> {
  return {
    iconType: entry.iconType,
    iconName: entry.iconName,
    iconSvg: entry.iconSvg,
    savedIconId: entry.savedIconId,
  }
}

export interface IconLayoutSizes {
  iconSizePx: number
  captionFontSizePx: number
}

/** 按组件外框 w×h 计算图标与说明文字字号（随画布 resize 变化） */
export function resolveIconLayoutSizes(
  boxW: number,
  boxH: number,
  props: Record<string, unknown>,
): IconLayoutSizes {
  const pad = 8
  const innerW = Math.max(0, boxW - pad * 2)
  const innerH = Math.max(0, boxH - pad * 2)
  const caption = String(props.caption ?? '').trim()
  const hasCaption = caption.length > 0

  let scale = Number(props.iconScale)
  if (!Number.isFinite(scale) || scale <= 0) {
    // 兼容旧配置：fontSize 与默认 120 框的大致比例
    const legacy = Number(props.fontSize)
    scale = Number.isFinite(legacy) && legacy > 0 ? Math.min(1, legacy / 120) : 0.85
  }
  scale = Math.min(1, Math.max(0.2, scale))

  const iconAreaH = hasCaption ? innerH * 0.72 : innerH
  const fit = Math.min(innerW, iconAreaH) * scale
  const iconSizePx = Math.max(12, Math.round(fit))
  const captionFontSizePx = hasCaption
    ? Math.max(9, Math.round(iconSizePx * 0.32))
    : 0

  return { iconSizePx, captionFontSizePx }
}
