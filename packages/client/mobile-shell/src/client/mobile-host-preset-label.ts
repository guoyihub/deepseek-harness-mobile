import type { MobileKey } from './locales.ts'
import { mobileConversationT } from './mobile-locale.ts'

/** Built-in agent preset ids shipped with the base bundle. */
const BUILT_IN_PRESET_LABEL_KEYS: Record<string, MobileKey> = {
  standard: 'preset.standard',
  code: 'preset.code',
  minimal: 'preset.minimal',
  cordis: 'preset.cordis',
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
    const key = BUILT_IN_PRESET_LABEL_KEYS[preset.id]
    if (key !== undefined) return mobileConversationT(key)
  }
  return preset.name ?? preset.id
}
