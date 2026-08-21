import { describe, expect, it } from 'vitest'
import {
  isMobileThemeDark,
  MOBILE_THEME_COLOR_DARK,
  MOBILE_THEME_COLOR_LIGHT,
} from '../src/client/mobile-theme.ts'

describe('mobile browser chrome theme sync', () => {
  it('exposes light and dark status-bar colors aligned with design tokens', () => {
    expect(MOBILE_THEME_COLOR_LIGHT).toBe('#ffffff')
    expect(MOBILE_THEME_COLOR_DARK).toBe('#151517')
  })

  it('resolves explicit and system dark preferences', () => {
    expect(isMobileThemeDark('dark')).toBe(true)
    expect(isMobileThemeDark('light')).toBe(false)
  })
})
