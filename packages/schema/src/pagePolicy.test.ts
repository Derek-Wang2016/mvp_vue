import { describe, it, expect } from 'vitest'
import {
  SYSTEM_PAGE_ID_MAX,
  MIN_USER_PAGE_ID,
  isSystemPageId,
} from './pagePolicy'

describe('pagePolicy', () => {
  it('exports consistent thresholds', () => {
    expect(SYSTEM_PAGE_ID_MAX).toBe(99)
    expect(MIN_USER_PAGE_ID).toBe(100)
    expect(SYSTEM_PAGE_ID_MAX + 1).toBe(MIN_USER_PAGE_ID)
  })

  it('isSystemPageId for reserved range', () => {
    expect(isSystemPageId(1)).toBe(true)
    expect(isSystemPageId(99)).toBe(true)
    expect(isSystemPageId(100)).toBe(false)
    expect(isSystemPageId(0)).toBe(false)
    expect(isSystemPageId(-1)).toBe(false)
  })
})
