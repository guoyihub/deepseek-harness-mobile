import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { IconCheckOutline16, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import { mobileApi } from './mobile-api-client.ts'
import { agentPresetDisplayLabel } from './mobile-host-preset-label.ts'
import css from './mobile-shell.module.css'

interface AgentPresetEntry {
  id: string
  trust: 'system' | 'user'
  isDefault: boolean
  name?: string | undefined
  description?: string | undefined
  broken?: string | undefined
}

interface PresetPickerState {
  presets: readonly AgentPresetEntry[]
  status: 'idle' | 'loading' | 'ready' | 'selecting' | 'error'
  errorMessage?: string | undefined
}

/** Props for {@link AgentPresetPickerModal}. */
export interface AgentPresetPickerModalProps {
  open: boolean
  onClose: () => void
  /** Called after the Host accepts the new deployment default preset. */
  onSelected: () => void
}

/**
 * Deployment default agent preset picker for mobile connection settings.
 * @param props - open state and callbacks.
 */
export function AgentPresetPickerModal({
  open,
  onClose,
  onSelected,
}: AgentPresetPickerModalProps): JSX.Element {
  const [state, setState] = useState<PresetPickerState>({
    presets: [],
    status: 'idle',
  })
  const generationRef = useRef(0)

  const load = useCallback(async (): Promise<void> => {
    const generation = ++generationRef.current
    setState({ presets: [], status: 'loading' })
    const response = await mobileApi.agentPresets.list({})
    if (generation !== generationRef.current) return
    const listResult = response.result
    if (!listResult.ok) {
      setState({
        presets: [],
        status: 'error',
        errorMessage: listResult.error.message,
      })
      return
    }
    setState({ presets: listResult.value.presets, status: 'ready' })
  }, [])

  useEffect(() => {
    if (!open) {
      generationRef.current += 1
      setState({ presets: [], status: 'idle' })
      return
    }
    void load()
  }, [load, open])

  const select = useCallback(async (preset: AgentPresetEntry): Promise<void> => {
    if (preset.broken !== undefined) return
    const generation = ++generationRef.current
    setState(current => ({ ...current, status: 'selecting' }))
    const response = await mobileApi.settings.update({
      ns: 'agent-presets',
      patch: { default: preset.id },
    })
    if (generation !== generationRef.current) return
    const updateResult = response.result
    if (!updateResult.ok) {
      setState(current => ({
        ...current,
        status: 'error',
        errorMessage: updateResult.error.message,
      }))
      return
    }
    setState(current => ({
      presets: current.presets.map(row => ({ ...row, isDefault: row.id === preset.id })),
      status: 'ready',
    }))
    onSelected()
    onClose()
  }, [onClose, onSelected])

  const defaultId = useMemo(
    () => state.presets.find(preset => preset.isDefault)?.id,
    [state.presets],
  )

  const body = state.status === 'loading' || state.status === 'selecting'
    ? <p className={css.mSetPickerStatus}>{state.status === 'loading' ? '加载预设列表…' : '正在保存…'}</p>
    : state.status === 'error'
      ? <p className={css.mSetPickerError} role="alert">{state.errorMessage ?? '预设列表加载失败'}</p>
      : state.presets.length === 0
        ? <p className={css.mSetPickerStatus}>当前 Host 没有可用 Agent 预设</p>
        : (
          <div className={css.mSetPickerList}>
            {state.presets.map((preset) => {
              const selected = preset.id === defaultId
              const broken = preset.broken !== undefined
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={css.mSetPickerItem}
                  data-selected={selected || undefined}
                  disabled={state.status !== 'ready' || broken}
                  onClick={() => { void select(preset) }}
                >
                  <span className={css.mSetPickerItemText}>
                    <span>{agentPresetDisplayLabel(preset)}</span>
                    {broken && (
                      <span className={css.mSetPickerItemMeta}>加载失败</span>
                    )}
                  </span>
                  {selected && <IconCheckOutline16 size={16} aria-hidden />}
                </button>
              )
            })}
            <p className={css.mSetPickerHint}>对新创建的会话生效；运行中的会话保持原有预设。</p>
          </div>
        )

  return (
    <Modal open={open} onClose={onClose} title="Agent 预设" closeLabel="关闭">
      {body}
    </Modal>
  )
}
