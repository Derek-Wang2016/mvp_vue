import type { CardFieldConfig, CardEmptyDisplayConfig, CardArrayFilterCondition } from '@mvp-vue/schema'

export function cardDefaultProps() {
  return {
    apiUrl: '',
    fixedParams: {},
    dataPath: 'data',
    refreshInterval: 0,
    arrayFilters: [] as CardArrayFilterCondition[],
    /** 本组件「导入字段」白名单；空=不额外限制（仍受页面数据源白名单约束） */
    importFieldWhitelist: [] as string[],
    noMatchText: '无匹配数据',
    cardBgColor: 'rgba(15,24,36,0.85)',
    cardBorderColor: '#1e293b',
    cardBorderRadius: 8,
    cardGridCols: 1,
    cardGridRows: undefined,
    cardGridRowGap: 8,
    cardGridColumnGap: 8,
    itemInset: 6,
    fields: [] as CardFieldConfig[],
    emptyDisplay: {
      enabled: false,
      watchFields: [],
      watchMode: 'any' as const,
      retainFields: [],
    } satisfies CardEmptyDisplayConfig,
  }
}

export function cardDefaultSize() {
  return { w: 320, h: 180 }
}
