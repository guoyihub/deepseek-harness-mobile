// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  KEYBOARD_LIFT_ANIMATE_ATTR,
  KEYBOARD_OPENING_LIFT_DELAY_MS,
  KEYBOARD_OPENING_SETTLE_MS,
  MOBILE_KEYBOARD_LIFT_VAR,
  bindMobileChatKeyboardLift,
} from '../src/client/mobile-chat-keyboard-lift.ts'
import { MOBILE_KEYBOARD_OPEN_ATTR } from '../src/client/mobile-visual-viewport.ts'

function stubViewport(options: {
  height: number
  offsetTop?: number
  innerHeight?: number
}): {
  setHeight: (height: number) => void
} {
  let height = options.height
  const listeners = new Map<string, Set<() => void>>()
  vi.stubGlobal('innerHeight', options.innerHeight ?? 800)
  vi.stubGlobal('scrollTo', vi.fn())
  vi.stubGlobal('scrollX', 0)
  vi.stubGlobal('scrollY', 0)
  vi.stubGlobal('visualViewport', {
    get height() {
      return height
    },
    get offsetTop() {
      return options.offsetTop ?? 0
    },
    addEventListener: (event: string, handler: () => void) => {
      const set = listeners.get(event) ?? new Set()
      set.add(handler)
      listeners.set(event, set)
    },
    removeEventListener: (event: string, handler: () => void) => {
      listeners.get(event)?.delete(handler)
    },
  })

  const emit = (event: string): void => {
    listeners.get(event)?.forEach((handler) => { handler() })
  }

  return {
    setHeight: (next: number) => {
      height = next
      emit('resize')
    },
  }
}

describe('bindMobileChatKeyboardLift', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('keeps lift at zero until the keyboard settles and the post-open delay elapses', () => {
    const root = document.createElement('div')
    document.body.append(root)
    const viewport = stubViewport({ height: 800 })
    const onLiftChange = vi.fn()

    bindMobileChatKeyboardLift(root, { onLiftChange })
    const textarea = document.createElement('textarea')
    root.append(textarea)
    textarea.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    viewport.setHeight(500)
    vi.advanceTimersByTime(KEYBOARD_OPENING_SETTLE_MS - 1)
    expect(root.style.getPropertyValue(MOBILE_KEYBOARD_LIFT_VAR)).toBe('0px')
    expect(onLiftChange).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(root.style.getPropertyValue(MOBILE_KEYBOARD_LIFT_VAR)).toBe('0px')

    vi.advanceTimersByTime(KEYBOARD_OPENING_LIFT_DELAY_MS - 1)
    expect(root.style.getPropertyValue(MOBILE_KEYBOARD_LIFT_VAR)).toBe('0px')

    vi.advanceTimersByTime(1)

    expect(root.style.getPropertyValue(MOBILE_KEYBOARD_LIFT_VAR)).toBe('300px')
    expect(root.hasAttribute(KEYBOARD_LIFT_ANIMATE_ATTR)).toBe(true)
    expect(onLiftChange).toHaveBeenCalledWith(300)
    root.remove()
  })

  it('marks the viewport shell keyboard-open only after lift applies', () => {
    const shell = document.createElement('div')
    shell.setAttribute('data-mobile-viewport-shell', '')
    const root = document.createElement('div')
    shell.append(root)
    document.body.append(shell)
    const viewport = stubViewport({ height: 800 })

    bindMobileChatKeyboardLift(root)
    const textarea = document.createElement('textarea')
    root.append(textarea)
    textarea.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    expect(shell.hasAttribute(MOBILE_KEYBOARD_OPEN_ATTR)).toBe(false)

    viewport.setHeight(500)
    vi.advanceTimersByTime(KEYBOARD_OPENING_SETTLE_MS + KEYBOARD_OPENING_LIFT_DELAY_MS)

    expect(shell.hasAttribute(MOBILE_KEYBOARD_OPEN_ATTR)).toBe(true)
    shell.remove()
  })

  it('keeps lift at zero while keyboard height is still changing', () => {
    const root = document.createElement('div')
    document.body.append(root)
    const viewport = stubViewport({ height: 800 })

    bindMobileChatKeyboardLift(root)
    const textarea = document.createElement('textarea')
    root.append(textarea)
    textarea.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    viewport.setHeight(620)
    vi.advanceTimersByTime(80)
    viewport.setHeight(560)
    vi.advanceTimersByTime(80)
    viewport.setHeight(500)

    vi.advanceTimersByTime(KEYBOARD_OPENING_SETTLE_MS + KEYBOARD_OPENING_LIFT_DELAY_MS - 1)
    expect(root.style.getPropertyValue(MOBILE_KEYBOARD_LIFT_VAR)).toBe('0px')

    vi.advanceTimersByTime(1)
    expect(root.style.getPropertyValue(MOBILE_KEYBOARD_LIFT_VAR)).toBe('300px')
    root.remove()
  })

  it('follows viewport height while open', () => {
    const root = document.createElement('div')
    document.body.append(root)
    const viewport = stubViewport({ height: 800 })
    const onLiftChange = vi.fn()

    bindMobileChatKeyboardLift(root, { onLiftChange })
    const textarea = document.createElement('textarea')
    root.append(textarea)
    textarea.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    viewport.setHeight(500)
    vi.advanceTimersByTime(KEYBOARD_OPENING_SETTLE_MS + KEYBOARD_OPENING_LIFT_DELAY_MS)
    onLiftChange.mockClear()

    viewport.setHeight(460)

    expect(root.style.getPropertyValue(MOBILE_KEYBOARD_LIFT_VAR)).toBe('340px')
    expect(onLiftChange).toHaveBeenCalledWith(340)
    root.remove()
  })

  it('animates lift back to zero on blur after keyboard closes', () => {
    const root = document.createElement('div')
    document.body.append(root)
    const viewport = stubViewport({ height: 800 })
    bindMobileChatKeyboardLift(root, { closingSettleMs: 50 })

    const textarea = document.createElement('textarea')
    root.append(textarea)
    textarea.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    viewport.setHeight(500)
    vi.advanceTimersByTime(KEYBOARD_OPENING_SETTLE_MS + KEYBOARD_OPENING_LIFT_DELAY_MS)
    expect(root.style.getPropertyValue(MOBILE_KEYBOARD_LIFT_VAR)).toBe('300px')

    textarea.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    vi.runAllTimers()
    expect(root.style.getPropertyValue(MOBILE_KEYBOARD_LIFT_VAR)).toBe('0px')

    viewport.setHeight(800)
    vi.advanceTimersByTime(50)

    expect(root.style.getPropertyValue(MOBILE_KEYBOARD_LIFT_VAR)).toBe('0px')
    root.remove()
  })

  it('clears lift custom property when disposed', () => {
    const root = document.createElement('div')
    document.body.append(root)
    stubViewport({ height: 720 })

    const dispose = bindMobileChatKeyboardLift(root)
    dispose()

    expect(root.style.getPropertyValue(MOBILE_KEYBOARD_LIFT_VAR)).toBe('')
    expect(root.hasAttribute(KEYBOARD_LIFT_ANIMATE_ATTR)).toBe(false)
    root.remove()
  })
})
