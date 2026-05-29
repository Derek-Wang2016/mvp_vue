import { describe, it, expect } from 'vitest'
import { resolveImportFieldNames, resolveCombinedImportFieldNames } from './dataSource'

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
