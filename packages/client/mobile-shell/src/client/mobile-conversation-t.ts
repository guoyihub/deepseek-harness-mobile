/** Locale seat for desktop Chat Node views mounted in the mobile shell. */

import { zh as chatZh } from '@deepseek-ai/dsh-client-ui-chat/src/client/locale.ts'

type Params = Record<string, unknown>

/** Shorter message-footer copy for narrow mobile screens. */
const MOBILE_CHAT_OVERRIDES: Record<string, string> = {
  'copy': '复制',
  'copied': '已复制',
  'message.ranFor': '{duration}',
  'message.ttft': '首{seconds}s',
  'message.tokensPerSecond': '{tps}/s',
  'duration.seconds': '{seconds}s',
  'duration.minutes': '{minutes}:{seconds}',
}

/**
 * Resolve one conversation-namespace string (desktop Chat copy).
 * @param key - locale key without namespace prefix.
 * @param params - optional `{name}` placeholders.
 */
export function mobileChatT(key: string, params?: Params): string {
  const template = MOBILE_CHAT_OVERRIDES[key] ?? (chatZh as Record<string, string>)[key] ?? key
  if (params === undefined) return template
  return Object.entries(params).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, String(value)),
    template,
  )
}
