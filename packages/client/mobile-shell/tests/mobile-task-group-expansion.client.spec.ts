import { describe, expect, it, beforeEach } from 'vitest'
import {
  isMobileGroupExpanded,
  loadMobileGroupExpansion,
  mobileExpandedGroupKeys,
  pruneMobileGroupExpansion,
  saveMobileGroupExpansion,
} from '../src/client/mobile-task-group-expansion.ts'

const STORAGE_KEY = 'dsh.mobile.taskHome.groupExpansion'

function installLocalStorage(): void {
  const store = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value) },
      removeItem: (key: string) => { store.delete(key) },
    },
  })
}

describe('mobile task group expansion', () => {
  beforeEach(() => {
    installLocalStorage()
    localStorage.removeItem(STORAGE_KEY)
  })

  it('defaults to only the first group expanded', () => {
    const keys = ['a', 'b', 'ungrouped']
    expect(isMobileGroupExpanded('a', keys, {})).toBe(true)
    expect(isMobileGroupExpanded('b', keys, {})).toBe(false)
    expect(mobileExpandedGroupKeys(keys, {})).toEqual(['a'])
  })

  it('persists explicit expansion changes', () => {
    const keys = ['a', 'b']
    const saved = saveMobileGroupExpansion({}, 'b', true)
    expect(mobileExpandedGroupKeys(keys, saved)).toEqual(['a', 'b'])
    expect(loadMobileGroupExpansion()).toEqual({ b: true })
  })

  it('prunes stale group keys', () => {
    const pruned = pruneMobileGroupExpansion({ a: true, stale: false }, ['a', 'b'])
    expect(pruned).toEqual({ a: true })
  })
})
