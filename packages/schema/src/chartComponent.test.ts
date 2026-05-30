import { describe, it, expect } from 'vitest'
import { filterChartArrayRows, parseChartFilterValues, asChartRowArray } from './chartComponent'

describe('parseChartFilterValues', () => {
  it('trims and drops empty strings', () => {
    expect(parseChartFilterValues([' 北京 ', '', '上海'])).toEqual(['北京', '上海'])
  })
})

describe('asChartRowArray', () => {
  it('unwraps data property', () => {
    expect(asChartRowArray({ data: [{ a: 1 }] })).toEqual([{ a: 1 }])
  })
})

describe('filterChartArrayRows', () => {
  const rows = [
    { NAME: '北京', VALUE: 100 },
    { NAME: '上海', VALUE: 200 },
    { NAME: '天津', VALUE: 150 },
    { NAME: '广州', VALUE: 80 },
  ]

  it('returns all rows when filter not configured', () => {
    expect(filterChartArrayRows(rows, '', ['北京'])).toEqual(rows)
    expect(filterChartArrayRows(rows, 'NAME', [])).toEqual(rows)
    expect(filterChartArrayRows(rows, undefined, undefined)).toEqual(rows)
  })

  it('keeps rows matching any whitelist value', () => {
    expect(filterChartArrayRows(rows, 'NAME', ['北京', '上海', '天津'])).toEqual([
      { NAME: '北京', VALUE: 100 },
      { NAME: '上海', VALUE: 200 },
      { NAME: '天津', VALUE: 150 },
    ])
  })

  it('matches trimmed field values', () => {
    const data = [{ city: ' 北京 ', v: 1 }]
    expect(filterChartArrayRows(data, 'city', ['北京'])).toEqual(data)
  })

  it('excludes non-object rows when filter active', () => {
    expect(filterChartArrayRows([1, 'x', { NAME: '北京' }], 'NAME', ['北京'])).toEqual([
      { NAME: '北京' },
    ])
  })
})
