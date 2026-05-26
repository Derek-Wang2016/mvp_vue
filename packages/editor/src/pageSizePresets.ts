export const PAGE_SIZE_MIN_WIDTH = 320
export const PAGE_SIZE_MAX_WIDTH = 7680
export const PAGE_SIZE_MIN_HEIGHT = 240
export const PAGE_SIZE_MAX_HEIGHT = 4320

export type PageSizePresetId = 'fhd' | '4k' | 'hd' | 'qhd' | 'custom'

export const PAGE_SIZE_PRESETS: {
  id: PageSizePresetId
  label: string
  width: number
  height: number
}[] = [
  { id: 'fhd', label: '1920×1080 (FHD)', width: 1920, height: 1080 },
  { id: '4k', label: '3840×2160 (4K)', width: 3840, height: 2160 },
  { id: 'hd', label: '1366×768', width: 1366, height: 768 },
  { id: 'qhd', label: '2560×1440', width: 2560, height: 1440 },
  { id: 'custom', label: '自定义', width: 0, height: 0 },
]

export function clampPageSize(width: number, height: number): { width: number; height: number } {
  return {
    width: Math.min(PAGE_SIZE_MAX_WIDTH, Math.max(PAGE_SIZE_MIN_WIDTH, Math.round(width))),
    height: Math.min(PAGE_SIZE_MAX_HEIGHT, Math.max(PAGE_SIZE_MIN_HEIGHT, Math.round(height))),
  }
}

export function presetIdForSize(width: number, height: number): PageSizePresetId {
  const match = PAGE_SIZE_PRESETS.find(
    (p) => p.id !== 'custom' && p.width === width && p.height === height,
  )
  return match?.id ?? 'custom'
}
