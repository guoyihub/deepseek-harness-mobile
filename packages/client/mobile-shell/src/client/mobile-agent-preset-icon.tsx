/** Per-preset header icon for built-in and custom agent presets. */

import type { ReactElement } from 'react'
import {
  IconAgentPresetOutline16,
  IconCodeOutline16,
  IconEditOutline16,
  IconPersonalizationOutline16,
  IconSparkle16,
} from '@deepseek-ai/dsh-client-ui-primitives'

/** Props for {@link AgentPresetIcon}. */
export interface AgentPresetIconProps {
  /** Agent preset id (`standard`, `code`, `minimal`, `cordis`, or a custom id). */
  presetId: string
  size?: number
}

/**
 * Glyph that distinguishes one agent preset from another.
 * @param props - preset id and optional pixel size.
 */
export function AgentPresetIcon({ presetId, size = 14 }: AgentPresetIconProps): ReactElement {
  switch (presetId) {
    case 'standard':
      return <IconAgentPresetOutline16 size={size} aria-hidden />
    case 'code':
      return <IconCodeOutline16 size={size} aria-hidden />
    case 'minimal':
      return <IconEditOutline16 size={size} aria-hidden />
    case 'cordis':
      return <IconSparkle16 size={size} aria-hidden />
    default:
      return <IconPersonalizationOutline16 size={size} aria-hidden />
  }
}
