/** Staged subagent model allowlist for mobile settings. */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ModelProviderGroup } from '@deepseek-ai/dsh-api-session-controller/types'
import {
  subagentModelCandidates,
  subagentModelKey,
  type AllowedSubagentModel,
  type SubagentModelCandidate,
} from './mobile-subagent-models.ts'
import { directoryFromModelCatalog } from './mobile-model-catalog.ts'
import { mobileApi } from './mobile-api-client.ts'
import { mobileConversationT } from './mobile-locale.ts'
import css from './mobile-shell.module.css'

const NS = 'subagent-model-selection'

/** Props for {@link SubagentModelModal}. */
export interface SubagentModelModalProps {
  open: boolean
  onClose: () => void
}

interface SubagentSettings {
  enabled: boolean
  allowedModels: AllowedSubagentModel[]
}

/**
 * Authorization-scoped subagent provider/model picker.
 * @param props - open state and close handler.
 */
export function SubagentModelModal({ open, onClose }: SubagentModelModalProps): JSX.Element {
  const [enabled, setEnabled] = useState(false)
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set())
  const [stored, setStored] = useState<readonly AllowedSubagentModel[]>([])
  const [groups, setGroups] = useState<readonly ModelProviderGroup[]>([])
  const [revision, setRevision] = useState<number | undefined>(undefined)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'saving' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)

  const load = useCallback(async (): Promise<void> => {
    setStatus('loading')
    const [describe, catalog] = await Promise.all([
      mobileApi.settings.describe(),
      mobileApi.sessions.modelCatalog(),
    ])
    if (!describe.result.ok) {
      setStatus('error')
      setErrorMessage(describe.result.error.message)
      return
    }
    const ns = describe.result.value.namespaces.find(row => row.ns === NS)
    const value = (ns?.value ?? { enabled: false, allowedModels: [] }) as SubagentSettings
    setEnabled(value.enabled === true)
    setStored(value.allowedModels ?? [])
    setSelected(new Set((value.allowedModels ?? []).map(subagentModelKey)))
    setRevision(ns?.revision)
    if (catalog.result.ok) {
      setGroups(directoryFromModelCatalog(catalog.result.value).groups)
    }
    setStatus('ready')
  }, [])

  useEffect(() => {
    if (!open) {
      setStatus('idle')
      return
    }
    void load()
  }, [load, open])

  const candidates = useMemo(
    () => subagentModelCandidates(groups, stored, selected),
    [groups, selected, stored],
  )

  const toggleModel = (candidate: SubagentModelCandidate): void => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(candidate.key)) next.delete(candidate.key)
      else next.add(candidate.key)
      return next
    })
  }

  const save = async (): Promise<void> => {
    setStatus('saving')
    const allowedModels = candidates
      .filter(candidate => selected.has(candidate.key))
      .map(candidate => ({ provider: candidate.provider, model: candidate.model }))
    const response = await mobileApi.settings.update({
      ns: NS,
      patch: { enabled, allowedModels },
      ...(revision === undefined ? {} : { expectedRevision: revision }),
    })
    if (!response.result.ok) {
      setStatus('error')
      setErrorMessage(response.result.error.message)
      return
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={mobileConversationT('subagent.title')} closeLabel={mobileConversationT('common.close')}>
      {status === 'loading'
        ? <p className={css.mSetPickerStatus}>{mobileConversationT('common.loading')}</p>
        : status === 'error'
          ? <p className={css.mSetPickerError} role="alert">{errorMessage}</p>
          : (
            <div className={css.subagentCard}>
              <p className={css.mSetPickerHint}>{mobileConversationT('subagent.description')}</p>
              <label className={css.subagentToggle}>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => { setEnabled(value => !value) }}
                />
                {mobileConversationT('subagent.toggle')}
              </label>
              {enabled && candidates.map(candidate => (
                <label key={candidate.key} className={css.subagentModel}>
                  <input
                    type="checkbox"
                    checked={selected.has(candidate.key)}
                    onChange={() => { toggleModel(candidate) }}
                  />
                  <span>
                    {candidate.modelName}
                    <span className={css.subagentRoute}>{`${candidate.providerName} · ${candidate.provider}/${candidate.model}`}</span>
                  </span>
                </label>
              ))}
              <button
                type="button"
                className={css.reconnectBannerAction}
                disabled={status === 'saving' || (enabled && selected.size === 0)}
                onClick={() => { void save() }}
              >
                {mobileConversationT('subagent.save')}
              </button>
            </div>
          )}
    </Modal>
  )
}
