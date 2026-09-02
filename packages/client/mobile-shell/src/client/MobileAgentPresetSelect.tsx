/** Blank-session agent-preset picker for the mobile chat header tab row. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import {
  IconChevronDownOutline14,
  Menu,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives'
import { mobileApi } from './mobile-api-client.ts'
import { getMobileAgentPresets } from './mobile-host-metadata-cache.ts'
import {
  agentPresetDisplayLabel,
  agentPresetLabelFromId,
  type AgentPresetLabelSource,
} from './mobile-host-preset-label.ts'
import { AgentPresetIcon } from './mobile-agent-preset-icon.tsx'
import { mobileConversationT } from './mobile-locale.ts'
import css from './mobile-shell.module.css'

interface AgentPresetRow extends AgentPresetLabelSource {
  isDefault?: boolean
  broken?: string | undefined
}

/** Props for {@link MobileAgentPresetSelect}. */
export interface MobileAgentPresetSelectProps {
  sessionId: SessionId
  /** Current session agent-preset projection, if the Host already recorded one. */
  currentId: string | undefined
  /** Whether controls are temporarily locked while the agent runs. */
  locked: boolean
  /** Surface select failures outside the menu. */
  onError?: ((message: string) => void) | undefined
}

/**
 * Dropdown that applies a preset to the still-blank session.
 * @param props - session id, current preset, and lock state.
 */
export function MobileAgentPresetSelect({
  sessionId,
  currentId,
  locked,
  onError,
}: MobileAgentPresetSelectProps): JSX.Element {
  const [roster, setRoster] = useState<readonly AgentPresetRow[]>([])
  const [selectedId, setSelectedId] = useState(currentId)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setSelectedId(currentId)
  }, [currentId])

  useEffect(() => {
    void getMobileAgentPresets().then((snapshot) => {
      const rows = snapshot.presets as readonly AgentPresetRow[]
      setRoster(rows)
      setSelectedId((current) => {
        if (current !== undefined && current !== '') return current
        return rows.find(row => row.isDefault)?.id ?? rows[0]?.id
      })
    }).catch((error: unknown) => {
      onError?.(error instanceof Error ? error.message : String(error))
    })
  }, [onError])

  const label = selectedId === undefined
    ? mobileConversationT('preset.loading')
    : agentPresetLabelFromId(selectedId, roster)

  const { items, choiceById } = useMemo(() => {
    const entries: MenuEntry[] = []
    const choices = new Map<string, AgentPresetRow>()
    for (const row of roster) {
      if (row.broken !== undefined) continue
      choices.set(row.id, row)
      entries.push({
        id: row.id,
        label: agentPresetDisplayLabel(row),
        icon: <AgentPresetIcon presetId={row.id} />,
      })
    }
    return { items: entries, choiceById: choices }
  }, [roster])

  const getAnchorRect = useCallback(
    () => anchorRef.current?.getBoundingClientRect() ?? null,
    [],
  )

  const onSelect = useCallback(async (id: string): Promise<void> => {
    if (locked || busy || id === selectedId || choiceById.get(id) === undefined) {
      setOpen(false)
      return
    }
    setBusy(true)
    setOpen(false)
    const previous = selectedId
    setSelectedId(id)
    try {
      const response = await mobileApi.agentPresets.select({
        sessionId,
        agentPreset: id,
      })
      if (!response.result.ok) {
        setSelectedId(previous)
        onError?.(response.result.error.message)
        return
      }
      setSelectedId(response.result.value)
    } catch (error) {
      setSelectedId(previous)
      onError?.(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }, [busy, choiceById, locked, onError, selectedId, sessionId])

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={css.headerPresetChip}
        disabled={locked || busy || items.length === 0}
        aria-haspopup="menu"
        aria-expanded={open}
        title={mobileConversationT('preset.chooseHint')}
        onClick={() => { setOpen(value => !value) }}
      >
        <AgentPresetIcon presetId={selectedId ?? 'standard'} />
        <span className={css.chatHeaderPresetText}>{label}</span>
        <IconChevronDownOutline14 size={12} aria-hidden />
      </button>
      <Menu
        open={open && !locked}
        anchor={null}
        items={items}
        selectedId={selectedId}
        side="bottom"
        portal
        getAnchorRect={getAnchorRect}
        onSelect={(id) => { void onSelect(id) }}
        onClose={() => { setOpen(false) }}
      />
    </>
  )
}
