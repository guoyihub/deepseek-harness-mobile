/** Read-only session agent-preset label for the mobile chat header tab row. */

import { useEffect, useState } from 'react'
import { getMobileAgentPresets } from './mobile-host-metadata-cache.ts'
import { AgentPresetIcon } from './mobile-agent-preset-icon.tsx'
import {
  agentPresetLabelFromId,
  type AgentPresetLabelSource,
} from './mobile-host-preset-label.ts'
import { mobileConversationT } from './mobile-locale.ts'
import css from './mobile-shell.module.css'

/** Props for {@link MobileAgentPresetLabel}. */
export interface MobileAgentPresetLabelProps {
  /** Session agent-preset projection id. */
  presetId: string
}

/**
 * Render the fixed agent preset name where desktop shows the conversation tabs.
 * @param props - session preset id.
 */
export function MobileAgentPresetLabel({ presetId }: MobileAgentPresetLabelProps): JSX.Element {
  const [label, setLabel] = useState(() => agentPresetLabelFromId(presetId))

  useEffect(() => {
    setLabel(agentPresetLabelFromId(presetId))
    void getMobileAgentPresets().then((snapshot) => {
      setLabel(agentPresetLabelFromId(
        presetId,
        snapshot.presets as readonly AgentPresetLabelSource[],
      ))
    }).catch(() => {
      // Roster failure keeps the built-in id fallback from the initial render.
    })
  }, [presetId])

  return (
    <span
      className={css.chatHeaderPresetLabel}
      title={mobileConversationT('preset.headerHint')}
    >
      <AgentPresetIcon presetId={presetId} />
      <span className={css.chatHeaderPresetText}>{label}</span>
    </span>
  )
}
