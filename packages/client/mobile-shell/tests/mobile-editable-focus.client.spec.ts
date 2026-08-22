// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  bindMobileEditableFocusWithoutScroll,
  focusMobileEditableWithoutScroll,
  keepMobileEditableFocus,
  needsMobileFocusWithoutScroll,
} from '../src/client/mobile-editable-focus.ts'

describe('needsMobileFocusWithoutScroll', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns true on iPhone user agents', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      platform: 'iPhone',
      maxTouchPoints: 5,
    })
    expect(needsMobileFocusWithoutScroll()).toBe(true)
  })

  it('returns false on desktop Chrome', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      platform: 'Win32',
      maxTouchPoints: 0,
    })
    expect(needsMobileFocusWithoutScroll()).toBe(false)
  })
})

describe('focusMobileEditableWithoutScroll', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('pins the layout viewport before focusing', () => {
    const scrollTo = vi.fn()
    const focus = vi.fn()
    vi.stubGlobal('scrollTo', scrollTo)

    const element = document.createElement('textarea')
    element.focus = focus

    focusMobileEditableWithoutScroll(element)

    expect(scrollTo).toHaveBeenCalledWith(0, 0)
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
  })
})

describe('keepMobileEditableFocus', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('suppresses default and refocuses the active editable', () => {
    const scrollTo = vi.fn()
    vi.stubGlobal('scrollTo', scrollTo)

    const textarea = document.createElement('textarea')
    document.body.append(textarea)
    textarea.focus()
    const focusSpy = vi.spyOn(textarea, 'focus')

    const preventDefault = vi.fn()
    keepMobileEditableFocus({ preventDefault })

    expect(preventDefault).toHaveBeenCalled()
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true })
    textarea.remove()
  })
})

describe('bindMobileEditableFocusWithoutScroll', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('unlocks readonly and pins the viewport on iOS touchstart without blocking paste', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      platform: 'iPhone',
      maxTouchPoints: 5,
    })
    const scrollTo = vi.fn()
    vi.stubGlobal('scrollTo', scrollTo)

    const element = document.createElement('textarea')
    const focus = vi.fn()
    element.focus = focus
    const preventDefault = vi.fn()
    const event = new Event('touchstart', { cancelable: true, bubbles: true }) as TouchEvent
    event.preventDefault = preventDefault

    bindMobileEditableFocusWithoutScroll(element)
    expect(element.readOnly).toBe(true)

    element.dispatchEvent(event)

    expect(element.readOnly).toBe(false)
    expect(preventDefault).not.toHaveBeenCalled()
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
    expect(focus).not.toHaveBeenCalled()

    element.dispatchEvent(new Event('blur'))
    expect(element.readOnly).toBe(true)
  })

  it('is a no-op off iOS', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      platform: 'Win32',
      maxTouchPoints: 0,
    })

    const element = document.createElement('textarea')
    const addEventListener = vi.spyOn(element, 'addEventListener')

    bindMobileEditableFocusWithoutScroll(element)

    expect(addEventListener).not.toHaveBeenCalled()
  })
})
