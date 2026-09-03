/** Locale seat for desktop Conversation UI mounted in the mobile shell. */

import { en as commonEn } from '@deepseek-ai/dsh-client-locale/src/locales/en.ts'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import { en as conversationEn, zh as conversationZh } from '@deepseek-ai/dsh-client-ui-conversation/src/client/locales.ts'

type Params = Record<string, unknown>

function conversationDict(english: boolean): Record<string, string> {
  return english ? conversationEn : conversationZh
}

function commonDict(english: boolean): Record<string, string> {
  return english ? commonEn : commonZh
}

/**
 * Resolve one conversation-namespace string (Queue dock, Enter settings copy).
 * @param key - locale key without namespace prefix.
 * @param params - optional `{name}` placeholders.
 */
export function mobileConversationUiT(key: string, params?: Params): string {
  const english = typeof document !== 'undefined' && document.documentElement.lang.toLowerCase().startsWith('en')
  const template = conversationDict(english)[key as keyof typeof conversationEn]
    ?? commonDict(english)[key]
    ?? key
  if (params === undefined) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match)
}
