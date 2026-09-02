/** Local theme preference for the mobile PWA shell. */

/** Persisted mobile appearance preference. */
export type MobileThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'dsh.mobile.theme'

/** Browser status-bar / safe-area tint in light mode (`--dsw-static-neutral-bluish-00`). */
export const MOBILE_THEME_COLOR_LIGHT = '#ffffff'

/** Browser status-bar / safe-area tint in dark mode (`--dsw-static-neutral-bluish-950`). */
export const MOBILE_THEME_COLOR_DARK = '#151517'

/**
 * Resolve whether one preference renders dark tokens.
 * @param preference - selected appearance mode.
 */
export function isMobileThemeDark(preference: MobileThemePreference): boolean {
  const systemDark = preference === 'system'
    && typeof globalThis.matchMedia !== 'undefined'
    && globalThis.matchMedia('(prefers-color-scheme: dark)').matches
  return preference === 'dark' || systemDark
}

/**
 * Sync OS browser chrome (status bar / safe-area tint) with the active theme.
 * @param dark - whether the resolved theme is dark.
 */
export function syncMobileBrowserChrome(dark: boolean): void {
  if (typeof document === 'undefined') return
  const color = dark ? MOBILE_THEME_COLOR_DARK : MOBILE_THEME_COLOR_LIGHT
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.setAttribute('content', color)
  }
}

/**
 * Read the stored mobile theme preference.
 * @returns saved preference, or `system` when unset.
 */
export function readMobileThemePreference(): MobileThemePreference {
  try {
    const value = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') return value
  } catch {
    return 'system'
  }
  return 'system'
}

/**
 * Persist one mobile theme preference.
 * @param preference - selected appearance mode.
 */
export function writeMobileThemePreference(preference: MobileThemePreference): void {
  globalThis.localStorage?.setItem(STORAGE_KEY, preference)
}

/**
 * Apply the resolved dark/light DOM flags for one preference.
 * @param preference - selected appearance mode.
 */
export function applyMobileTheme(preference: MobileThemePreference): void {
  const dark = isMobileThemeDark(preference)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  document.documentElement.toggleAttribute('data-ds-dark-theme', dark)
  document.body.toggleAttribute('data-ds-dark-theme', dark)
  syncMobileBrowserChrome(dark)
}

/** Persisted mobile content font-size preference in pixels. */
export type MobileFontSize = 13 | 14 | 16

const FONT_STORAGE_KEY = 'dsh.mobile.fontSize'

/**
 * Read the stored mobile content font size.
 */
export function readMobileFontSize(): MobileFontSize {
  try {
    const value = Number(globalThis.localStorage?.getItem(FONT_STORAGE_KEY))
    if (value === 13 || value === 14 || value === 16) return value
  } catch {
    return 14
  }
  return 14
}

/**
 * Persist one mobile content font size.
 * @param size - selected pixel size.
 */
export function writeMobileFontSize(size: MobileFontSize): void {
  globalThis.localStorage?.setItem(FONT_STORAGE_KEY, String(size))
}

/**
 * Apply `--dsh-content-font-size` so Markdown and tables follow the setting.
 * @param size - selected pixel size.
 */
export function applyMobileFontSize(size: MobileFontSize): void {
  if (typeof document === 'undefined') return
  document.body.style.setProperty('--dsh-content-font-size', `${String(size)}px`)
}

/**
 * Subscribe to system theme changes when preference is `system`.
 * @param preference - selected appearance mode.
 * @param listener - callback when the resolved theme may have changed.
 */
export function subscribeMobileTheme(preference: MobileThemePreference, listener: () => void): () => void {
  if (preference !== 'system' || typeof globalThis.matchMedia === 'undefined') return () => {}
  const media = globalThis.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', listener)
  return () => { media.removeEventListener('change', listener) }
}

const A2HS_DISMISSED_KEY = 'dsh.mobile.a2hsDismissed'

/**
 * Whether the add-to-home-screen hint was dismissed.
 */
export function isA2hsDismissed(): boolean {
  try {
    return globalThis.localStorage?.getItem(A2HS_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

/** Persist dismissal of the add-to-home-screen hint. */
export function dismissA2hsHint(): void {
  globalThis.localStorage?.setItem(A2HS_DISMISSED_KEY, '1')
}

/**
 * Whether the app is already running as an installed PWA.
 */
export function isStandaloneDisplayMode(): boolean {
  return globalThis.matchMedia?.('(display-mode: standalone)').matches === true
    || (globalThis.navigator as Navigator & { standalone?: boolean }).standalone === true
}
