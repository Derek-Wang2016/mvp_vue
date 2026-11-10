import type { HmiDocument } from './types'

export function fontPx(fonts: Record<string, number>, name: string | undefined, fallback = 16): number {
  if (!name) return fallback
  if (fonts[name] != null) return fonts[name]
  const n = Number(name)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function colorOf(colors: Record<string, string>, value: string | undefined, fallback = 'transparent'): string {
  if (!value) return fallback
  if (value.startsWith('$')) return colors[value.slice(1)] || value
  return colors[value] || value
}

export function displayText(doc: HmiDocument, raw: unknown): string {
  if (raw == null) return ''
  const text = String(raw)
  return doc.abbrs[text] ?? text
}

export function sampleValue(doc: HmiDocument, prop: string | undefined): unknown {
  if (!prop) return ''
  if (prop === 'CLOCK') return formatClock(new Date())
  return doc.sample[prop]
}

export function formatClock(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const week = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(date.getDate())}日 ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${week[date.getDay()]}`
}

export function deviceJson(doc: HmiDocument) {
  return {
    version: doc.version,
    screen: doc.screen,
    fonts: doc.fonts,
    colors: doc.colors,
    abbrs: doc.abbrs,
    cards: doc.cards,
  }
}
