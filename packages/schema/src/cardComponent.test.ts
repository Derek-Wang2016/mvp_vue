import { describe, it, expect } from 'vitest'
import {
  resolveByPath,
  resolveCardItem,
  matchCardArrayItem,
} from './cardComponent'

describe('resolveByPath', () => {
  it('returns nested value', () => {
    expect(resolveByPath({ data: { list: [1] } }, 'data.list')).toEqual([1])
  })

  it('returns root when path empty', () => {
    expect(resolveByPath({ a: 1 }, '')).toEqual({ a: 1 })
  })
})

describe('resolveCardItem', () => {
  it('returns object directly', () => {
    const obj = { name: 'a' }
    expect(resolveCardItem(obj, [])).toBe(obj)
  })

  it('returns first array element when no filters', () => {
    expect(resolveCardItem([{ id: '1' }, { id: '2' }], [])).toEqual({ id: '1' })
  })

  it('returns first AND match', () => {
    const arr = [
      { type: 'x', level: 'low' },
      { type: 'alert', level: 'high' },
      { type: 'alert', level: 'low' },
    ]
    expect(
      resolveCardItem(arr, [
        { field: 'type', operator: 'eq', value: 'alert' },
        { field: 'level', operator: 'eq', value: 'high' },
      ]),
    ).toEqual({ type: 'alert', level: 'high' })
  })

  it('returns null when no match', () => {
    expect(
      resolveCardItem([{ type: 'a' }], [{ field: 'type', operator: 'eq', value: 'b' }]),
    ).toBeNull()
  })

  it('uses numeric compare for gt', () => {
    expect(
      matchCardArrayItem({ score: '10' }, [{ field: 'score', operator: 'gt', value: '5' }]),
    ).toBe(true)
    expect(
      matchCardArrayItem({ score: '3' }, [{ field: 'score', operator: 'gt', value: '5' }]),
    ).toBe(false)
  })
})
