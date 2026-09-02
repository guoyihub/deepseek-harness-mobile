/** Locale helpers for the mobile shell over {@link ./locales.ts}. */

import { createContext, useContext } from 'react'
import { en, zh, type MobileKey } from './locales.ts'
import type { MobileLanguagePreference, MobileResolvedLanguage } from './mobile-language.ts'

type Params = Record<string, string | number>

/** Current resolved mobile language; pages subscribe via {@link useMobileLanguage}. */
export const MobileLanguageContext = createContext<MobileResolvedLanguage>('zh')

/** Persist and apply a language preference from settings. */
export const MobileLanguageSetContext = createContext<(preference: MobileLanguagePreference) => void>(() => {})

/**
 * Resolved mobile language for the current render.
 */
export function useMobileLanguage(): MobileResolvedLanguage {
  return useContext(MobileLanguageContext)
}

/**
 * Language preference writer provided by the shell.
 */
export function useSetMobileLanguage(): (preference: MobileLanguagePreference) => void {
  return useContext(MobileLanguageSetContext)
}

const PERMISSION_LABEL_KEYS = {
  'read-only': 'permission.readOnly',
  'workspace-write': 'permission.workspaceWrite',
  'danger-full-access': 'permission.fullAccess',
} as const satisfies Record<string, MobileKey>

/**
 * Render a permission preset label for the mobile composer menu.
 * @param value - preset machine value from the permissions projection.
 * @param name - host-supplied preset name for custom entries.
 */
export function mobilePermissionLabel(value: string, name: string): string {
  const key = PERMISSION_LABEL_KEYS[value as keyof typeof PERMISSION_LABEL_KEYS]
  if (key !== undefined) return mobileConversationT(key)
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) return name
  return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

/**
 * Resolve one mobile-namespace string.
 * @param key - locale key without namespace prefix.
 * @param params - optional `{name}` placeholders.
 */
export function mobileConversationT(key: MobileKey | string, params?: Params): string {
  const language = typeof document !== 'undefined' && document.documentElement.lang.toLowerCase().startsWith('en')
    ? 'en'
    : 'zh'
  const dict = language === 'en' ? en : zh
  const template = (dict as Record<string, string>)[key] ?? (zh as Record<string, string>)[key] ?? key
  if (params === undefined) return template
  return Object.entries(params).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, String(value)),
    template,
  )
}
