/** Iconify 风格的小库。body 只是 SVG 片段，没有 svg 根节点。 */
export interface IconEntry {
  name: string
  body: string
}

export const ICON_SIZE = { width: 24, height: 24 }

export const ICON_CATALOG: Record<string, IconEntry> = {
  'care-1': {
    name: '一级圆标',
    body: '<circle cx="12" cy="12" r="10"/><path fill="#FFFFFF" d="M11 6h2v12h-2z"/>',
  },
  'care-2': {
    name: '二级圆标',
    body: '<circle cx="12" cy="12" r="10"/><path fill="#FFFFFF" d="M8 7h2v10H8zM14 7h2v10h-2z"/>',
  },
  'care-3': {
    name: '三级圆标',
    body: '<circle cx="12" cy="12" r="10"/><path fill="#FFFFFF" d="M6 7h2v10H6zM11 7h2v10h-2zM16 7h2v10h-2z"/>',
  },
  heart: {
    name: '心形',
    body: '<path d="M12 20s-7-4.4-9.2-8.2C1 8.6 2.4 5 6.2 5c2 0 3.2 1.1 3.8 2.1C10.6 6.1 11.8 5 13.8 5 17.6 5 19 8.6 17.2 11.8 15 15.6 12 20 12 20z"/>',
  },
  alert: {
    name: '警告',
    body: '<path d="M12 3 22 20H2z"/><path fill="#FFFFFF" d="M11 9h2v6h-2zM11 16.5h2V19h-2z"/>',
  },
  ring: {
    name: '描边圆环',
    body: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/>',
  },
}

export const ICON_OPTIONS = Object.entries(ICON_CATALOG).map(([id, entry]) => ({ id, name: entry.name }))
