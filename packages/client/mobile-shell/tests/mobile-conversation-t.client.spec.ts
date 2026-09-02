import { describe, expect, it } from 'vitest'
import { formatTokens } from '@deepseek-ai/dsh-client-ui-chat/src/client/chat/token-format.ts'
import { mobileChatT } from '../src/client/mobile-conversation-t.ts'

describe('mobileChatT', () => {
  it('reuses desktop chat copy without mobile-only overrides', () => {
    expect(mobileChatT('message.ranFor', { duration: '8秒' })).toBe('用时 8秒')
    expect(mobileChatT('chat.deepDiving')).toBe('深度求索中...')
  })

  it('falls back to common number formatting keys for turn usage', () => {
    expect(mobileChatT('number.thousand', { value: '43.4' })).toBe('43.4K')
    expect(formatTokens(43_400, mobileChatT)).toBe('43.4K')
    const total = mobileChatT('message.turnUsage.count', { count: formatTokens(43_400, mobileChatT) })
    expect(total).toBe('43.4K tok')
    expect(mobileChatT('message.turnUsage.consumed', { total })).toBe('用量 43.4K tok')
  })
})
