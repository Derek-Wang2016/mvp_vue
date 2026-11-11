import { ICON_CATALOG, ICON_SIZE } from './catalog'

/** 设备显示前把这个颜色换成条目上的 color。 */
export const SVG_PLACEHOLDER = '#010101'

const STROKE = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin']
const ALLOWED: Record<string, string[]> = {
  path: ['d', ...STROKE],
  rect: ['x', 'y', 'width', 'height', 'rx', 'ry', ...STROKE],
  circle: ['cx', 'cy', 'r', ...STROKE],
}

const BANNED = /<(?:linearGradient|radialGradient|filter|use|animate|animateTransform|style|script|clipPath|mask|image|text|foreignObject|defs|polygon|polyline|ellipse|line)\b/i
const INHERIT = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin']

/** Tabler 常把 stroke 写在 g 上。没有 transform 时拆开，属性交给里面的形状。 */
function unwrapGroups(body: string): string | null {
  if (BANNED.test(body) || /<g\b[^>]*\btransform\s*=/i.test(body)) return null
  const flat = body.replace(/<g\b([^>]*)>([\s\S]*?)<\/g>/gi, (_all, attr: string, inner: string) => {
    const parent = readAttrs(attr) ?? {}
    return inner.replace(/<(path|rect|circle)\b([^>]*?)\/?>/gi, (tag, kind: string, raw: string) => {
      const attrs = readAttrs(raw)
      if (!attrs) return tag
      for (const key of INHERIT) {
        if (!attrs[key] && parent[key]) attrs[key] = parent[key]
      }
      const rendered = Object.entries(attrs).map(([key, value]) => `${key}="${escapeAttr(value)}"`).join(' ')
      return `<${kind} ${rendered}/>`
    })
  })
  if (/<g\b/i.test(flat)) return null
  return flat
}

export function toLvglSvg(body: string, width = ICON_SIZE.width, height = ICON_SIZE.height): string | null {
  const flat = unwrapGroups(body)
  if (flat == null) return null
  body = flat
  const tags = [...body.matchAll(/<(path|rect|circle)\b([^>]*?)\/?>/gi)]
  if (tags.length === 0) return null
  const parts: string[] = []
  for (const tag of tags) {
    const kind = (tag[1] ?? '').toLowerCase()
    const attrs = readAttrs(tag[2] ?? '')
    if (!attrs) return null
    const allowed = ALLOWED[kind]
    if (!allowed) return null
    for (const key of Object.keys(attrs)) {
      if (!allowed.includes(key)) delete attrs[key]
    }
    if (kind === 'path' && !attrs.d) return null
    if (kind === 'circle' && !attrs.r) return null
    paintAttr(attrs, 'fill')
    paintAttr(attrs, 'stroke')
    if (!attrs.fill && !attrs.stroke) attrs.fill = SVG_PLACEHOLDER
    const order = allowed.filter((key) => attrs[key] != null && attrs[key] !== '')
    const rendered = order.map((key) => `${key}="${escapeAttr(attrs[key] ?? '')}"`).join(' ')
    parts.push(`<${kind} ${rendered}/>`)
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet">${parts.join('')}</svg>`
}

export function iconSvg(id: string | undefined): string | null {
  if (!id) return null
  const entry = ICON_CATALOG[id]
  if (!entry) return null
  return toLvglSvg(entry.body)
}

/** 字典里可以是内置 id、导入的 id，或已经收好的 svg。 */
export function resolveIcon(entry: string | undefined, library?: Record<string, string>): string | null {
  if (!entry) return null
  const text = entry.trim()
  if (text.startsWith('<svg')) return text
  if (library?.[text]) return library[text]
  return iconSvg(text)
}

/** 预览和固件同一规则：只替换占位色。 */
export function paintSvg(svg: string, color: string): string {
  return svg.replaceAll(SVG_PLACEHOLDER, color || SVG_PLACEHOLDER)
}

function paintAttr(attrs: Record<string, string>, key: 'fill' | 'stroke') {
  const value = attrs[key]
  if (value && value.toLowerCase() === 'currentcolor') attrs[key] = SVG_PLACEHOLDER
}

function readAttrs(raw: string): Record<string, string> | null {
  const attrs: Record<string, string> = {}
  const re = /([:\w.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g
  let rest = raw
  for (const found of raw.matchAll(re)) {
    rest = rest.replace(found[0], '')
    const key = (found[1] ?? '').toLowerCase()
    attrs[key] = found[2] ?? found[3] ?? found[4] ?? ''
  }
  if (rest.trim() !== '') return null
  return attrs
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}
