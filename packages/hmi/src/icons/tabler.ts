import { icons } from '@iconify-json/tabler'

/** 取 tabler 图标集的 SVG 字符串。name 可以是图标名，也可以是别名。 */
export function tabler(name: string, size = 16): string {
  const alias = icons.aliases?.[name]
  const icon = icons.icons[(alias?.parent ?? name) as keyof typeof icons.icons]
  if (!icon?.body) return ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon.body}</svg>`
}
