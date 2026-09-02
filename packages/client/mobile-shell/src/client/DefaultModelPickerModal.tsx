import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {
  ModelProviderGroup,
  ModelSelection,
} from '@deepseek-ai/dsh-api-session-controller/types'
import { IconCheckOutline16, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import { mobileApi } from './mobile-api-client.ts'
import { getMobileModelCatalog } from './mobile-host-metadata-cache.ts'
import { directoryFromModelCatalog, modelSelectionKey } from './mobile-model-catalog.ts'
import { modelSelectionLabel } from './mobile-model-label.ts'
import { mobileConversationT } from './mobile-locale.ts'
import css from './mobile-shell.module.css'

interface ModelDirectoryState {
  current: ModelSelection | null
  groups: readonly ModelProviderGroup[]
  status: 'idle' | 'loading' | 'ready' | 'selecting' | 'error'
  errorMessage?: string | undefined
}

/** Props for {@link DefaultModelPickerModal}. */
export interface DefaultModelPickerModalProps {
  /** Current dialog visibility. */
  open: boolean
  /** Close without changing selection. */
  onClose: () => void
  /** Resolve one session id used for `session.models` / `session.selectModel`. */
  resolveSessionId: () => Promise<SessionId | undefined>
  /** Called after the Host accepts the new deployment default. */
  onSelected: (selection: ModelSelection) => void
}

/**
 * Deployment default model picker for the mobile connection settings sheet.
 * @param props - open state, session resolver, and callbacks.
 */
export function DefaultModelPickerModal({
  open,
  onClose,
  resolveSessionId,
  onSelected,
}: DefaultModelPickerModalProps): JSX.Element {
  const [state, setState] = useState<ModelDirectoryState>({
    current: null,
    groups: [],
    status: 'idle',
  })
  const generationRef = useRef(0)

  const load = useCallback(async (): Promise<void> => {
    const generation = ++generationRef.current
    setState({ current: null, groups: [], status: 'loading' })
    const sessionId = await resolveSessionId()
    if (generation !== generationRef.current) return
    if (sessionId === undefined) {
      setState({
        current: null,
        groups: [],
        status: 'error',
        errorMessage: mobileConversationT('model.sessionCreateFailed'),
      })
      return
    }
    try {
      const catalog = await getMobileModelCatalog()
      if (generation !== generationRef.current) return
      setState({ ...directoryFromModelCatalog(catalog), status: 'ready' })
    } catch (loadError) {
      if (generation !== generationRef.current) return
      setState({
        current: null,
        groups: [],
        status: 'error',
        errorMessage: loadError instanceof Error ? loadError.message : String(loadError),
      })
    }
  }, [resolveSessionId])

  useEffect(() => {
    if (!open) {
      generationRef.current += 1
      setState({ current: null, groups: [], status: 'idle' })
      return
    }
    void load()
  }, [load, open])

  const select = useCallback(async (selection: ModelSelection): Promise<void> => {
    const generation = ++generationRef.current
    setState(current => ({ ...current, status: 'selecting' }))
    const sessionId = await resolveSessionId()
    if (generation !== generationRef.current) return
    if (sessionId === undefined) {
      setState(current => ({
        ...current,
        status: 'error',
        errorMessage: mobileConversationT('model.sessionCreateFailed'),
      }))
      return
    }
    const response = await mobileApi.sessions.selectModel({
      sessionId,
      provider: selection.provider,
      model: selection.model,
      ...(selection.reasoningEffort === undefined
        ? {}
        : { reasoningEffort: selection.reasoningEffort }),
    })
    if (generation !== generationRef.current) return
    const selectResult = response.result
    if (!selectResult.ok) {
      setState(current => ({
        ...current,
        status: 'error',
        errorMessage: selectResult.error.message,
      }))
      return
    }
    const selected = selectResult.value.selected
    setState(current => ({
      ...current,
      current: selected ?? current.current,
      status: 'ready',
    }))
    onSelected(selected)
    onClose()
  }, [onClose, onSelected, resolveSessionId])

  const entries = useMemo(() => {
    const rows: Array<
      | { kind: 'label'; id: string; text: string }
      | { kind: 'model'; id: string; label: string; selection: ModelSelection }
    > = []
    for (const group of state.groups) {
      rows.push({ kind: 'label', id: `label:${group.id}`, text: group.name })
      for (const model of group.models) {
        const selection: ModelSelection = {
          provider: group.id,
          model: model.id,
          ...(model.reasoning?.defaultEffort === undefined
            ? {}
            : { reasoningEffort: model.reasoning.defaultEffort }),
        }
        rows.push({
          kind: 'model',
          id: `${group.id}:${model.id}`,
          label: model.name,
          selection,
        })
      }
    }
    return rows
  }, [state.groups])

  const selectedKey = modelSelectionKey(state.current)

  const body = state.status === 'loading' || state.status === 'selecting'
    ? <p className={css.mSetPickerStatus}>{state.status === 'loading' ? mobileConversationT('model.loading') : mobileConversationT('model.switching')}</p>
    : state.status === 'error'
      ? <p className={css.mSetPickerError} role="alert">{state.errorMessage ?? mobileConversationT('model.loadFailed')}</p>
      : entries.length === 0
        ? <p className={css.mSetPickerStatus}>{mobileConversationT('model.empty')}</p>
        : (
          <div className={css.mSetPickerList}>
            {entries.map((entry) => {
              if (entry.kind === 'label') {
                return (
                  <div key={entry.id} className={css.mSetPickerSectionLabel}>{entry.text}</div>
                )
              }
              const selected = entry.id === selectedKey
              return (
                <button
                  key={entry.id}
                  type="button"
                  className={css.mSetPickerItem}
                  data-selected={selected || undefined}
                  disabled={state.status !== 'ready'}
                  onClick={() => { void select(entry.selection) }}
                >
                  <span>{entry.label}</span>
                  {selected && <IconCheckOutline16 size={16} aria-hidden />}
                </button>
              )
            })}
            {state.current !== null && (
              <p className={css.mSetPickerHint}>
                {mobileConversationT('model.currentDefaultPrefix')}
                {modelSelectionLabel(state.current, state.groups)}
              </p>
            )}
          </div>
        )

  return (
    <Modal open={open} onClose={onClose} title={mobileConversationT('model.defaultTitle')} closeLabel={mobileConversationT('common.close')}>
      {body}
    </Modal>
  )
}
