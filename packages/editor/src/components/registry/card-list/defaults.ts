import type { CardFieldConfig, CardEmptyDisplayConfig } from '@mvp-vue/schema'

export function cardListDefaultProps() {
  return {
    apiUrl: '',
    fixedParams: {},
    pageSize: 10,
    pageFlipInterval: 10,
    refreshInterval: 0,
    dataListPath: 'data.list',
    dataTotalPath: 'data.total',
    cols: 5,
    rows: 2,
    gap: 12,
    cardBgColor: 'rgba(15,24,36,0.85)',
    cardBorderColor: '#1e293b',
    cardBorderRadius: 8,
    cardGridCols: 1,
    cardGridRows: undefined,
    cardGridRowGap: 8,
    cardGridColumnGap: 8,
    fields: [] as CardFieldConfig[],
    emptyDisplay: {
      enabled: false,
      watchFields: [],
      watchMode: 'any' as const,
      retainFields: [],
    } satisfies CardEmptyDisplayConfig,
  }
}

export function cardListDefaultSize() {
  return { w: 800, h: 300 }
}
