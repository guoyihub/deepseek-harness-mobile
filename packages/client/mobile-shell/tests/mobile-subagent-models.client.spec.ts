import { describe, expect, it } from 'vitest'
import type { ModelProviderGroup } from '@deepseek-ai/dsh-api-session-controller/types'
import { subagentModelCandidates, subagentModelKey } from '../src/client/mobile-subagent-models.ts'

describe('subagent model keys', () => {
  it('joins catalog rows with stored routes that left the catalog', () => {
    const groups: ModelProviderGroup[] = [{
      id: 'deepseek',
      name: 'DeepSeek',
      models: [{ id: 'deepseek-chat', name: 'Chat' }],
    }]
    const stale = { provider: 'gone', model: 'old' }
    const selected = new Set([subagentModelKey({ provider: 'deepseek', model: 'deepseek-chat' })])
    const rows = subagentModelCandidates(groups, [stale], selected)
    expect(rows.map(row => row.key)).toEqual([
      subagentModelKey({ provider: 'deepseek', model: 'deepseek-chat' }),
      subagentModelKey(stale),
    ])
    expect(rows[0]?.selected).toBe(true)
    expect(rows[0]?.available).toBe(true)
    expect(rows[1]?.available).toBe(false)
  })
})
