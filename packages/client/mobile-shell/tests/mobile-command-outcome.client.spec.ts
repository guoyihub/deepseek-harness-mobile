import { describe, expect, it } from 'vitest'
import type { CommandNode } from '@deepseek-ai/dsh-client-runtime/client'
import { localizeCommandNode, localizeCommandOutcome } from '../src/client/mobile-command-outcome.ts'

function commandNode(over: Partial<CommandNode> & Pick<CommandNode, 'commandId'>): CommandNode {
  return {
    kind: 'command',
    seq: 1,
    time: 1,
    name: null,
    args: null,
    outcome: null,
    ...over,
  }
}

describe('localizeCommandOutcome', () => {
  it('localizes feedback usage errors', () => {
    expect(localizeCommandOutcome(
      'feedback',
      'Feedback text is required. Usage: /feedback <text>',
      'error',
    )).toBe('请填写反馈内容。用法：/feedback <文字>')
  })

  it('localizes compact no-history success', () => {
    expect(localizeCommandOutcome('compact', 'No compactable history yet.', 'success'))
      .toBe('暂无可以压缩的历史记录')
  })

  it('localizes compact completion success', () => {
    expect(localizeCommandOutcome(
      'compact',
      'Compacted 3 history items (~1200 tokens).',
      'success',
    )).toBe('已压缩 3 条历史记录（约 1200 tokens）')
  })

  it('passes through unknown handler text', () => {
    expect(localizeCommandOutcome('export', 'Session log download requested.', 'success'))
      .toBe('Session log download requested.')
  })
})

describe('localizeCommandNode', () => {
  it('rewrites settled outcome text without mutating running nodes', () => {
    const running = commandNode({
      commandId: '1' as CommandNode['commandId'],
      name: 'compact',
    })
    expect(localizeCommandNode(running)).toBe(running)

    const settled = commandNode({
      commandId: '1' as CommandNode['commandId'],
      name: 'feedback',
      outcome: {
        kind: 'error',
        text: 'Feedback text is required. Usage: /feedback <text>',
      },
    })
    expect(localizeCommandNode(settled).outcome?.text)
      .toBe('请填写反馈内容。用法：/feedback <文字>')
  })
})
