/** 设备按 LV_SYMBOL_ 后面的名字取内置图标，大小写不敏感。 */
export const LVGL_SYMBOLS = [
  { id: 'CALL', name: '呼叫' },
  { id: 'BELL', name: '铃铛' },
  { id: 'HOME', name: '主页' },
  { id: 'SETTINGS', name: '设置' },
  { id: 'WARNING', name: '警告' },
  { id: 'OK', name: '确认' },
  { id: 'CLOSE', name: '关闭' },
  { id: 'LEFT', name: '向左' },
  { id: 'RIGHT', name: '向右' },
  { id: 'UP', name: '向上' },
  { id: 'DOWN', name: '向下' },
  { id: 'PLUS', name: '加' },
  { id: 'MINUS', name: '减' },
  { id: 'PLAY', name: '播放' },
  { id: 'PAUSE', name: '暂停' },
  { id: 'REFRESH', name: '刷新' },
  { id: 'WIFI', name: 'Wi-Fi' },
] as const

/** 写成 CALL 或 LV_SYMBOL_CALL 都收成 CALL。 */
export function lvglSymbolName(value: string | undefined): string {
  const raw = value?.trim() ?? ''
  if (!raw) return ''
  return raw.replace(/^LV_SYMBOL_/i, '').toUpperCase()
}
