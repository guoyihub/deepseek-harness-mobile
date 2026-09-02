/** Locale seat for desktop Chat Node views mounted in the mobile shell. */

import { en as commonEn } from '@deepseek-ai/dsh-client-locale/src/locales/en.ts'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import { en as chatEn, zh as chatZh } from '@deepseek-ai/dsh-client-ui-chat/src/client/locale.ts'

type Params = Record<string, unknown>

function chatDict(english: boolean): Record<string, string> {
  return english ? chatEn : chatZh
}

function commonDict(english: boolean): Record<string, string> {
  return english ? commonEn : commonZh
}

function resolveTemplate(key: string, english: boolean): string {
  return chatDict(english)[key] ?? commonDict(english)[key] ?? key
}

/**
 * Resolve one conversation-namespace string (desktop Chat copy).
 * Falls back through the shared common vocabulary like LocaleRuntime.
 * @param key - locale key without namespace prefix.
 * @param params - optional `{name}` placeholders.
 */
export function mobileChatT(key: string, params?: Params): string {
  const english = typeof document !== 'undefined' && document.documentElement.lang.toLowerCase().startsWith('en')
  const template = resolveTemplate(key, english)
  if (params === undefined) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match)
}
