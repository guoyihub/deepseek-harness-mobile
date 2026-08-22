import { describe, expect, it } from 'vitest'
import { mobileChatT } from '../src/client/mobile-conversation-t.ts'

describe('mobileChatT', () => {
  it('localizes copy feedback for message actions', () => {
    expect(mobileChatT('copy')).toBe('复制')
    expect(mobileChatT('copied')).toBe('已复制')
  })
})
