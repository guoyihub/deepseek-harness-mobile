// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import {
  applyMobileLanguage,
  readMobileLanguagePreference,
  resolveMobileLanguage,
  writeMobileLanguagePreference,
} from '../src/client/mobile-language.ts'
import {
  applyMobileFontSize,
  readMobileFontSize,
  writeMobileFontSize,
} from '../src/client/mobile-theme.ts'

afterEach(() => {
  localStorage.clear()
  document.documentElement.lang = ''
  document.body.style.removeProperty('--dsh-content-font-size')
})

describe('mobile language and font persistence', () => {
  it('persists language preference and writes html lang', () => {
    writeMobileLanguagePreference('en')
    expect(readMobileLanguagePreference()).toBe('en')
    expect(resolveMobileLanguage('en')).toBe('en')
    applyMobileLanguage('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('persists content font size on body', () => {
    writeMobileFontSize(16)
    expect(readMobileFontSize()).toBe(16)
    applyMobileFontSize(16)
    expect(document.body.style.getPropertyValue('--dsh-content-font-size')).toBe('16px')
  })
})
