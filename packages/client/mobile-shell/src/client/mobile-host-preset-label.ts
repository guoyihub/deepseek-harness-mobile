/** Built-in agent preset ids shipped with the base bundle. */
const BUILT_IN_PRESET_LABELS: Record<string, string> = {
  standard: '标准模式',
  code: 'PTC 模式',
  minimal: '极简模式',
  cordis: '创造模式',
}

/** Minimal fields needed to render one preset label on mobile. */
export interface AgentPresetLabelSource {
  id: string
  trust: 'system' | 'user'
  name?: string | undefined
}

/**
 * Resolve one agent preset label for mobile Host settings rows.
 * @param preset - roster row or default preset snapshot.
 */
export function agentPresetDisplayLabel(preset: AgentPresetLabelSource): string {
  if (preset.trust === 'system') {
    const builtIn = BUILT_IN_PRESET_LABELS[preset.id]
    if (builtIn !== undefined) return builtIn
  }
  return preset.name ?? preset.id
}
