// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  MOBILE_COMPOSER_TEXTAREA_LINE_HEIGHT_PX,
  MOBILE_COMPOSER_TEXTAREA_MAX_HEIGHT_PX,
  MOBILE_COMPOSER_TEXTAREA_MAX_LINES,
  syncMobileComposerTextareaHeight,
} from '../src/client/mobile-composer-textarea-height.ts'

describe('syncMobileComposerTextareaHeight', () => {
  it('keeps one line at rest and grows through four lines before capping', () => {
    const textarea = document.createElement('textarea')
    document.body.append(textarea)

    let scrollHeight = MOBILE_COMPOSER_TEXTAREA_LINE_HEIGHT_PX
    Object.defineProperty(textarea, 'scrollHeight', {
      configurable: true,
      get: () => scrollHeight,
    })

    syncMobileComposerTextareaHeight(textarea)
    expect(textarea.style.height).toBe(`${MOBILE_COMPOSER_TEXTAREA_LINE_HEIGHT_PX}px`)

    scrollHeight = MOBILE_COMPOSER_TEXTAREA_LINE_HEIGHT_PX * 3
    syncMobileComposerTextareaHeight(textarea)
    expect(textarea.style.height).toBe(`${MOBILE_COMPOSER_TEXTAREA_LINE_HEIGHT_PX * 3}px`)

    scrollHeight = MOBILE_COMPOSER_TEXTAREA_LINE_HEIGHT_PX * 4
    syncMobileComposerTextareaHeight(textarea)
    expect(textarea.style.height).toBe(`${MOBILE_COMPOSER_TEXTAREA_MAX_HEIGHT_PX}px`)

    scrollHeight = MOBILE_COMPOSER_TEXTAREA_LINE_HEIGHT_PX * MOBILE_COMPOSER_TEXTAREA_MAX_LINES + 48
    syncMobileComposerTextareaHeight(textarea)
    expect(textarea.style.height).toBe(`${MOBILE_COMPOSER_TEXTAREA_MAX_HEIGHT_PX}px`)

    textarea.remove()
  })
})
