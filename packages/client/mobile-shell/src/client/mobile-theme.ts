/** Local theme preference for the mobile PWA shell. */

/** Persisted mobile appearance preference. */
export type MobileThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'dsh.mobile.theme'

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
  const systemDark = preference === 'system'
    && typeof globalThis.matchMedia !== 'undefined'
    && globalThis.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = preference === 'dark' || systemDark
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  document.body.toggleAttribute('data-ds-dark-theme', dark)
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
