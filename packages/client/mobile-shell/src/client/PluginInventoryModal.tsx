/** Read-only plugin inventory grouped by agent preset and global Loader entries. */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PluginInventorySnapshot } from '@deepseek-ai/dsh-api-remotes/client'
import { mobileApi } from './mobile-api-client.ts'
import { agentPresetDisplayLabel } from './mobile-host-preset-label.ts'
import {
  fallbackPluginPreset,
  partitionGlobalPlugins,
  pluginMatchesQuery,
  pluginModuleShortName,
  type AgentPresetGroup,
} from './mobile-plugin-inventory.ts'
import { mobileConversationT } from './mobile-locale.ts'
import css from './mobile-shell.module.css'

/** Props for {@link PluginInventoryModal}. */
export interface PluginInventoryModalProps {
  open: boolean
  onClose: () => void
}

/**
 * Session-plugin vs global-plugin inventory for mobile settings.
 * @param props - open state and close handler.
 */
export function PluginInventoryModal({ open, onClose }: PluginInventoryModalProps): JSX.Element {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [snapshot, setSnapshot] = useState<PluginInventorySnapshot | undefined>(undefined)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const [query, setQuery] = useState('')
  const [presetId, setPresetId] = useState<string | undefined>(undefined)
  const [request, setRequest] = useState(0)

  const load = useCallback(async (): Promise<void> => {
    setStatus('loading')
    const response = await mobileApi.pluginInventory.list()
    if (!response.result.ok) {
      setStatus('error')
      setErrorMessage(response.result.error.message)
      return
    }
    setSnapshot(response.result.value)
    setStatus('ready')
  }, [])

  useEffect(() => {
    if (!open) {
      setStatus('idle')
      setSnapshot(undefined)
      setQuery('')
      setPresetId(undefined)
      return
    }
    void load()
  }, [load, open, request])

  const presets = snapshot?.agentPresets ?? []
  const selected = useMemo(() => {
    if (presetId === undefined) return fallbackPluginPreset(presets)
    return presets.find(preset => preset.id === presetId) ?? fallbackPluginPreset(presets)
  }, [presetId, presets])
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const { failed, regular } = partitionGlobalPlugins(snapshot?.entries ?? [])
  const globalRows = [...failed, ...regular].filter(entry => (
    pluginMatchesQuery(entry.moduleName, entry.entryId, normalizedQuery)
  ))
  const presetRows = (selected?.rows ?? []).filter(row => (
    pluginMatchesQuery(row.moduleName, row.entryId, normalizedQuery)
  ))
  const otherMatches = presets.filter(preset => (
    preset !== selected && preset.rows.some(row => pluginMatchesQuery(row.moduleName, row.entryId, normalizedQuery))
  ))

  const enableLabel = (enabled: boolean | 'conditional', failedRow: boolean): string => {
    if (failedRow) return mobileConversationT('plugins.failed')
    if (enabled === true) return mobileConversationT('plugins.enabled')
    if (enabled === false) return mobileConversationT('plugins.disabled')
    return mobileConversationT('plugins.conditional')
  }

  const body = status === 'loading'
    ? <p className={css.mSetPickerStatus}>{mobileConversationT('common.loading')}</p>
    : status === 'error'
      ? (
        <div className={css.mSetPickerError} role="alert">
          <p>{errorMessage ?? mobileConversationT('plugins.loadFailed')}</p>
          <button type="button" className={css.reconnectBannerAction} onClick={() => { setRequest(value => value + 1) }}>
            {mobileConversationT('plugins.retry')}
          </button>
        </div>
      )
      : (
        <>
          <input
            className={css.pluginSearch}
            value={query}
            placeholder={mobileConversationT('plugins.search')}
            onChange={(event) => { setQuery(event.target.value) }}
          />
          {presets.length > 0 && (
            <section className={css.pluginGroup}>
              <h3>{mobileConversationT('plugins.sessionGroup')}</h3>
              <div className={css.pluginPresetSwitch}>
                {presets.map((preset: AgentPresetGroup) => (
                  <button
                    key={preset.id}
                    type="button"
                    data-selected={preset.id === selected?.id || undefined}
                    onClick={() => { setPresetId(preset.id) }}
                  >
                    {agentPresetDisplayLabel(preset)}
                  </button>
                ))}
              </div>
              <ul className={css.pluginList}>
                {presetRows.map((row, index) => (
                  <li key={`${row.moduleName}:${String(index)}`}>
                    <span>{pluginModuleShortName(row.moduleName)}</span>
                    <span>{enableLabel(row.enabled, row.fiberPhase === 'failed')}</span>
                  </li>
                ))}
              </ul>
              {normalizedQuery.length > 0 && otherMatches.length > 0 && (
                <p className={css.mSetPickerHint}>
                  {mobileConversationT('plugins.otherPresetMatches', { count: otherMatches.length })}
                </p>
              )}
            </section>
          )}
          <section className={css.pluginGroup}>
            <h3>{mobileConversationT('plugins.globalGroup')}</h3>
            <ul className={css.pluginList}>
              {globalRows.map(entry => (
                <li key={entry.entryId}>
                  <span>{pluginModuleShortName(entry.moduleName)}</span>
                  <span>{enableLabel(entry.enabled, entry.fiberPhase === 'failed')}</span>
                </li>
              ))}
            </ul>
            {globalRows.length === 0 && presetRows.length === 0 && (
              <p className={css.mSetPickerStatus}>{mobileConversationT('plugins.empty')}</p>
            )}
          </section>
        </>
      )

  return (
    <Modal open={open} onClose={onClose} title={mobileConversationT('plugins.title')} closeLabel={mobileConversationT('common.close')}>
      {body}
    </Modal>
  )
}
