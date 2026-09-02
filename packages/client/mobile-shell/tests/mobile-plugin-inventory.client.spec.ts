import { describe, expect, it } from 'vitest'
import {
  fallbackPluginPreset,
  partitionGlobalPlugins,
  pluginMatchesQuery,
  pluginModuleShortName,
  type AgentPresetGroup,
  type PluginInventoryEntry,
} from '../src/client/mobile-plugin-inventory.ts'

function entry(
  moduleName: string,
  fiberPhase: PluginInventoryEntry['fiberPhase'],
): PluginInventoryEntry {
  return {
    entryId: moduleName as PluginInventoryEntry['entryId'],
    moduleName,
    enabled: fiberPhase !== 'failed',
    fiberPhase,
  }
}

describe('plugin inventory grouping', () => {
  it('shortens scoped dsh module names', () => {
    expect(pluginModuleShortName('@deepseek-ai/dsh-client-ui-chat')).toBe('ui-chat')
    expect(pluginModuleShortName('cordis:foo')).toBe('foo')
  })

  it('matches query against module or entry id', () => {
    expect(pluginMatchesQuery('@deepseek-ai/dsh-shell', 'shell', 'shell')).toBe(true)
    expect(pluginMatchesQuery('@deepseek-ai/dsh-shell', null, 'chat')).toBe(false)
  })

  it('lists failed global entries first', () => {
    const { failed, regular } = partitionGlobalPlugins([
      entry('@deepseek-ai/dsh-web', 'active'),
      entry('@deepseek-ai/dsh-lsp', 'failed'),
    ])
    expect(failed.map(row => row.moduleName)).toEqual(['@deepseek-ai/dsh-lsp'])
    expect(regular.map(row => row.moduleName)).toEqual(['@deepseek-ai/dsh-web'])
  })

  it('prefers the default agent preset', () => {
    const presets: AgentPresetGroup[] = [
      { id: 'code', trust: 'system', isDefault: false, rows: [] },
      { id: 'standard', trust: 'system', isDefault: true, rows: [] },
    ]
    expect(fallbackPluginPreset(presets)?.id).toBe('standard')
  })
})
