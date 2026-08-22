// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  isMobileMessageListAtBottom,
  MOBILE_MESSAGE_LIST_BOTTOM_THRESHOLD,
  mobileMessageListDistanceFromBottom,
} from '../src/client/mobile-message-list-scroll.ts'

function makeList(scrollHeight: number, clientHeight: number, scrollTop: number): HTMLDivElement {
  const list = document.createElement('div')
  Object.defineProperty(list, 'scrollHeight', { value: scrollHeight, configurable: true })
  Object.defineProperty(list, 'clientHeight', { value: clientHeight, configurable: true })
  Object.defineProperty(list, 'scrollTop', { value: scrollTop, writable: true, configurable: true })
  return list
}

describe('mobile-message-list-scroll', () => {
  it('measures distance from the scroll floor', () => {
    const list = makeList(1_000, 300, 636)
    expect(mobileMessageListDistanceFromBottom(list)).toBe(64)
  })

  it('treats readers within the threshold as at-bottom', () => {
    const list = makeList(1_000, 300, 636)
    expect(isMobileMessageListAtBottom(list)).toBe(true)
    list.scrollTop = 637
    expect(isMobileMessageListAtBottom(list)).toBe(true)
    list.scrollTop = 635
    expect(isMobileMessageListAtBottom(list)).toBe(false)
  })

  it('uses the shared mobile bottom threshold constant', () => {
    expect(MOBILE_MESSAGE_LIST_BOTTOM_THRESHOLD).toBe(64)
  })
})
