const SKIP_PAINT = new Set(['none', 'transparent', 'currentcolor'])

function isSkippablePaintValue(value: string): boolean {
  const v = value.trim()
  if (!v) return true
  if (SKIP_PAINT.has(v)) return true
  if (v.toLowerCase() === 'currentcolor') return true
  return false
}

/** 统计 SVG 中不同的 fill/stroke 颜色数量（用于判断是否适合单色着色） */
export function countDistinctPaintColors(svg: string): number {
  const colors = new Set<string>()
  const patterns = [
    /\bfill\s*=\s*"([^"]+)"/gi,
    /\bstroke\s*=\s*"([^"]+)"/gi,
    /\bfill\s*:\s*([^;"')\s]+)/gi,
    /\bstroke\s*:\s*([^;"')\s]+)/gi,
  ]
  for (const re of patterns) {
    let m: RegExpExecArray | null
    while ((m = re.exec(svg)) !== null) {
      if (!isSkippablePaintValue(m[1]!)) colors.add(m[1]!.trim().toLowerCase())
    }
  }
  return colors.size
}

/** 仅单色/无显式多色时可安全套用「图标颜色」 */
export function canRecolorInlineSvg(svg: string): boolean {
  return countDistinctPaintColors(svg) <= 1
}

/** 生成用于 CSS mask 的 SVG（形状转黑，保留透明区域与镂空细节） */
function normalizeSvgForMask(svg: string): string {
  let out = svg.trim()
  out = out.replace(/\bfill\s*=\s*"([^"]*)"/gi, (match, value: string) =>
    isSkippablePaintValue(value) ? match : 'fill="#000000"')
  out = out.replace(/\bstroke\s*=\s*"([^"]*)"/gi, (match, value: string) =>
    isSkippablePaintValue(value) ? match : 'stroke="#000000"')
  out = out.replace(/\bfill\s*:\s*([^;"')\s]+)/gi, (match, value: string) =>
    isSkippablePaintValue(value) ? match : 'fill:#000000')
  out = out.replace(/\bstroke\s*:\s*([^;"')\s]+)/gi, (match, value: string) =>
    isSkippablePaintValue(value) ? match : 'stroke:#000000')
  return out
}

export function svgToMaskDataUrl(svg: string): string {
  const normalized = normalizeSvgForMask(svg)
  const base64 = btoa(unescape(encodeURIComponent(normalized)))
  return `url("data:image/svg+xml;base64,${base64}")`
}

export type InlineSvgColorMode = 'original' | 'mask' | 'preserve-multicolor'

/** 决定内联 SVG 如何应用 color */
export function resolveInlineSvgColorMode(svg: string, color?: string): InlineSvgColorMode {
  if (!color?.trim() || !svg.trim()) return 'original'
  if (!canRecolorInlineSvg(svg)) return 'preserve-multicolor'
  return 'mask'
}

/**
 * @deprecated 会将所有 fill/stroke 设为同色，多层次线条/色块细节会丢失；请用 mask 方案。
 */
export function tintInlineSvg(svg: string, color: string): string {
  const c = color.trim()
  if (!c || !svg.trim()) return svg
  let out = svg
  out = out.replace(/\bfill\s*=\s*"([^"]*)"/gi, (match, value: string) =>
    isSkippablePaintValue(value) ? match : 'fill="currentColor"')
  out = out.replace(/\bstroke\s*=\s*"([^"]*)"/gi, (match, value: string) =>
    isSkippablePaintValue(value) ? match : 'stroke="currentColor"')
  out = out.replace(/^<svg([^>]*)>/i, (match, attrs: string) => {
    if (/style\s*=/i.test(attrs)) {
      return `<svg${attrs.replace(/style\s*=\s*"([^"]*)"/i, (_, style: string) =>
        `style="color:${c};${style}"`)}>`
    }
    return `<svg${attrs} style="color:${c}">`
  })
  return out
}
