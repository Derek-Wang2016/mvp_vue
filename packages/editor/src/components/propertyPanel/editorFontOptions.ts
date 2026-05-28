/** 与时间/文本组件属性面板一致的字体下拉选项 */
export const FONT_FAMILY_SELECT_CLASS =
  'editor-select w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors'

export const FONT_FAMILY_OPTIONS: { value: string; label: string }[] = [
  { value: 'sans-serif', label: '无衬线体' },
  { value: 'serif', label: '衬线体' },
  { value: 'monospace', label: '等宽字体' },
  { value: 'cursive', label: '手写体' },
  { value: 'fantasy', label: '装饰体' },
  { value: 'Share Tech Mono', label: 'LCD 数码' },
  { value: 'DSEG7 Classic', label: '七段数码 (DSEG7)' },
]

/** 键值标签等需兼容旧配置 inherit 时使用 */
export const FONT_FAMILY_OPTIONS_WITH_INHERIT: { value: string; label: string }[] = [
  { value: 'inherit', label: '默认（继承）' },
  ...FONT_FAMILY_OPTIONS,
]
