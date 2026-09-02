/** Local language preference for the mobile PWA shell. */

export type MobileLanguagePreference = 'zh' | 'en' | 'system'
export type MobileResolvedLanguage = 'zh' | 'en'

const STORAGE_KEY = 'dsh.mobile.language'

/**
 * Resolve a stored preference against the browser language.
 * @param preference - selected language mode.
 */
export function resolveMobileLanguage(preference: MobileLanguagePreference): MobileResolvedLanguage {
  if (preference === 'zh' || preference === 'en') return preference
  const tag = typeof navigator === 'undefined' ? 'en' : navigator.language
  return tag.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

/**
 * Read the stored mobile language preference.
 */
export function readMobileLanguagePreference(): MobileLanguagePreference {
  try {
    const value = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (value === 'zh' || value === 'en' || value === 'system') return value
  } catch {
    return 'system'
  }
  return 'system'
}

/**
 * Persist one mobile language preference.
 * @param preference - selected language mode.
 */
export function writeMobileLanguagePreference(preference: MobileLanguagePreference): void {
  globalThis.localStorage?.setItem(STORAGE_KEY, preference)
}

/**
 * Apply `lang` on the document root.
 * @param language - resolved zh or en.
 */
export function applyMobileLanguage(language: MobileResolvedLanguage): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
}
