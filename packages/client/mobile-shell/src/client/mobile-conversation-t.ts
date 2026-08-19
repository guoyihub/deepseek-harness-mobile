/** Locale seat for desktop Chat Node views mounted in the mobile shell. */

import { zh } from '@deepseek-ai/dsh-client-ui-conversation/src/client/locales.ts'

type Params = Record<string, unknown>

/**
 * Resolve one conversation-namespace string (desktop Chat copy).
 * @param key - locale key without namespace prefix.
 * @param params - optional `{name}` placeholders.
 */
export function mobileChatT(key: string, params?: Params): string {
  const template = (zh as Record<string, string>)[key] ?? key
  if (params === undefined) return template
  return Object.entries(params).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, String(value)),
    template,
  )
}
