import { describe, it, expect } from 'vitest'
import {
  resolveImportFieldNames,
  resolveCombinedImportFieldNames,
  resolveUrlQueryParamValue,
  appendQueryParamToUrl,
  resolveRestDataSourceUrl,
} from './dataSource'

describe('resolveImportFieldNames', () => {
  const sample = { a: 1, b: 2, c: 3 }

  it('returns all keys when whitelist empty', () => {
    expect(resolveImportFieldNames(sample, [])).toEqual(['a', 'b', 'c'])
    expect(resolveImportFieldNames(sample, undefined)).toEqual(['a', 'b', 'c'])
  })

  it('returns whitelist order only', () => {
    expect(resolveImportFieldNames(sample, ['c', 'a'])).toEqual(['c', 'a'])
  })
})

describe('resolveCombinedImportFieldNames', () => {
  const sample = { a: 1, b: 2, c: 3, d: 4 }

  it('applies component whitelist on top of data source', () => {
    expect(resolveCombinedImportFieldNames(sample, ['a', 'b', 'c'], ['b', 'a'])).toEqual(['b', 'a'])
  })

  it('uses component only when data source empty', () => {
    expect(resolveCombinedImportFieldNames(sample, [], ['c', 'd'])).toEqual(['c', 'd'])
  })
})

describe('resolveUrlQueryParamValue', () => {
  it('prefers URL value over default', () => {
    const params = new URLSearchParams('deviceId=abc')
    expect(resolveUrlQueryParamValue('deviceId', params, 'default-001')).toBe('abc')
  })

  it('uses default when URL param missing', () => {
    const params = new URLSearchParams('id=1')
    expect(resolveUrlQueryParamValue('deviceId', params, 'default-001')).toBe('default-001')
  })

  it('returns undefined when URL and default both missing', () => {
    const params = new URLSearchParams('id=1')
    expect(resolveUrlQueryParamValue('deviceId', params)).toBeUndefined()
    expect(resolveUrlQueryParamValue('deviceId', params, '  ')).toBeUndefined()
  })

  it('ignores empty param name', () => {
    const params = new URLSearchParams('deviceId=abc')
    expect(resolveUrlQueryParamValue('  ', params, 'x')).toBeUndefined()
  })
})

describe('appendQueryParamToUrl', () => {
  it('appends with ? when base has no query', () => {
    expect(appendQueryParamToUrl('https://api.example.com/data', 'deviceId', 'abc')).toBe(
      'https://api.example.com/data?deviceId=abc',
    )
  })

  it('appends with & when base already has query', () => {
    expect(appendQueryParamToUrl('https://api.example.com/data?foo=1', 'deviceId', 'abc')).toBe(
      'https://api.example.com/data?foo=1&deviceId=abc',
    )
  })
})

describe('resolveRestDataSourceUrl', () => {
  const base = { url: 'https://api.example.com/data' }

  it('returns undefined when url missing', () => {
    expect(resolveRestDataSourceUrl({}, new URLSearchParams())).toBeUndefined()
  })

  it('returns base url when urlQueryParam not configured', () => {
    expect(resolveRestDataSourceUrl(base, new URLSearchParams('deviceId=abc'))).toBe(base.url)
  })

  it('appends param from page URL', () => {
    const ds = { ...base, urlQueryParam: 'deviceId' }
    expect(resolveRestDataSourceUrl(ds, new URLSearchParams('deviceId=abc'))).toBe(
      'https://api.example.com/data?deviceId=abc',
    )
  })

  it('uses default when page URL lacks param', () => {
    const ds = { ...base, urlQueryParam: 'deviceId', urlQueryParamDefault: 'default-001' }
    expect(resolveRestDataSourceUrl(ds, new URLSearchParams('id=1'))).toBe(
      'https://api.example.com/data?deviceId=default-001',
    )
  })

  it('returns base url when param empty and no default', () => {
    const ds = { ...base, urlQueryParam: 'deviceId' }
    expect(resolveRestDataSourceUrl(ds, new URLSearchParams('id=1'))).toBe(base.url)
  })

  it('ignores empty urlQueryParam name', () => {
    const ds = { ...base, urlQueryParam: '  ' }
    expect(resolveRestDataSourceUrl(ds, new URLSearchParams('deviceId=abc'))).toBe(base.url)
  })
})
