/** Group plugin inventory rows for the mobile settings sheet. */

import type { PluginInventorySnapshot } from '@deepseek-ai/dsh-api-remotes/client'

export type PluginInventoryEntry = PluginInventorySnapshot['entries'][number]
export type AgentPresetGroup = NonNullable<PluginInventorySnapshot['agentPresets']>[number]

/**
 * Compact a module specifier for list display.
 * @param moduleName - Loader module name.
 */
export function pluginModuleShortName(moduleName: string): string {
  const unscoped = moduleName.startsWith('@') ? moduleName.slice(moduleName.indexOf('/') + 1) : moduleName
  return unscoped
    .replace(/^cordis:/, '')
    .replace(/^cordis-plugin-/, '')
    .replace(/^dsh-(?:host-|client-)?/, '')
}

/**
 * Whether a module or entry id matches the catalog query.
 */
export function pluginMatchesQuery(moduleName: string, entryId: string | null, query: string): boolean {
  if (query.length === 0) return true
  const normalized = query.toLocaleLowerCase()
  return [moduleName, ...entryId === null ? [] : [entryId]]
    .some(value => value.toLocaleLowerCase().includes(normalized))
}

/**
 * Default roster preset when the switcher has no explicit choice.
 */
export function fallbackPluginPreset(presets: readonly AgentPresetGroup[]): AgentPresetGroup | undefined {
  return presets.find(preset => preset.isDefault) ?? presets[0]
}

/**
 * Split global inventory entries into failed-first then the rest.
 */
export function partitionGlobalPlugins(entries: readonly PluginInventoryEntry[]): {
  failed: PluginInventoryEntry[]
  regular: PluginInventoryEntry[]
} {
  const failed: PluginInventoryEntry[] = []
  const regular: PluginInventoryEntry[] = []
  for (const entry of entries) {
    if (entry.fiberPhase === 'failed') failed.push(entry)
    else regular.push(entry)
  }
  return { failed, regular }
}
