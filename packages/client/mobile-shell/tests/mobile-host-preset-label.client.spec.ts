import { describe, expect, it } from 'vitest'
import { agentPresetDisplayLabel } from '../src/client/mobile-host-preset-label.ts'

describe('agentPresetDisplayLabel', () => {
  it('localizes built-in system presets', () => {
    expect(agentPresetDisplayLabel({ id: 'standard', trust: 'system' })).toBe('标准模式')
    expect(agentPresetDisplayLabel({ id: 'cordis', trust: 'system' })).toBe('创造模式')
  })

  it('prefers user-authored names', () => {
    expect(agentPresetDisplayLabel({
      id: 'mine',
      trust: 'user',
      name: 'My Agent',
    })).toBe('My Agent')
  })
})
