import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {
  ModelProviderGroup,
  ModelSelection,
} from '@deepseek-ai/dsh-api-session-controller/types'
import { IconChevronDownOutline14, Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import type { MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives'
import { mobileApi } from './mobile-api-client.ts'
import { modelSelectionLabel } from './mobile-model-label.ts'
import css from './mobile-shell.module.css'

/** Props for {@link MobileModelSelect}. */
export interface MobileModelSelectProps {
  sessionId: SessionId
  locked: boolean
  /** Inline chip in the composer toolbar, or desktop-style trigger. */
  variant?: 'chip' | 'pill' | 'toolbar' | undefined
  /** When true, keep the menu open (composer + menu / toolbar share one surface). */
  open?: boolean | undefined
  /** Report menu open changes so the + menu can open this picker. */
  onOpenChange?: ((open: boolean) => void) | undefined
}

interface ModelDirectoryState {
  current: ModelSelection | null
  groups: readonly ModelProviderGroup[]
  status: 'idle' | 'loading' | 'ready' | 'selecting' | 'error'
}

/**
 * Mobile model picker backed by session.models and session.selectModel RPC.
 * @param props - session id and lock state.
 */
export function MobileModelSelect({
  sessionId,
  locked,
  variant = 'chip',
  open: openProp,
  onOpenChange,
}: MobileModelSelectProps): JSX.Element {
  const [state, setState] = useState<ModelDirectoryState>({
    current: null,
    groups: [],
    status: 'idle',
  })
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = openProp ?? uncontrolledOpen
  const setOpen = useCallback((next: boolean | ((current: boolean) => boolean)): void => {
    const resolved = typeof next === 'function' ? next(openProp ?? uncontrolledOpen) : next
    if (openProp === undefined) setUncontrolledOpen(resolved)
    onOpenChange?.(resolved)
  }, [onOpenChange, openProp, uncontrolledOpen])
  const anchorRef = useRef<HTMLButtonElement>(null)
  const generationRef = useRef(0)

  const load = useCallback(async (): Promise<void> => {
    const generation = ++generationRef.current
    setState(current => ({ ...current, status: 'loading' }))
    const response = await mobileApi.sessions.models({ sessionId })
    if (generation !== generationRef.current) return
    if (!response.result.ok) {
      setState(current => ({ ...current, status: 'error' }))
      return
    }
    const { current, groups } = response.result.value
    setState({ current, groups, status: 'ready' })
  }, [sessionId])

  const select = useCallback(async (selection: ModelSelection): Promise<void> => {
    if (locked) return
    const generation = ++generationRef.current
    setState(current => ({ ...current, status: 'selecting' }))
    const response = await mobileApi.sessions.selectModel({
      sessionId,
      provider: selection.provider,
      model: selection.model,
      ...(selection.reasoningEffort === undefined
        ? {}
        : { reasoningEffort: selection.reasoningEffort }),
    })
    if (generation !== generationRef.current) return
    if (!response.result.ok) {
      setState(current => ({ ...current, status: 'error' }))
      return
    }
    const selected = response.result.value.selected
    setState(current => ({
      ...current,
      current: selected,
      status: 'ready',
    }))
  }, [locked, sessionId])

  useEffect(() => {
    generationRef.current += 1
    setState({ current: null, groups: [], status: 'idle' })
    void load()
  }, [load])

  useEffect(() => {
    if (locked) setOpen(false)
  }, [locked, setOpen])

  useEffect(() => {
    if (open) void load()
  }, [load, open])

  const getAnchorRect = useCallback(
    () => anchorRef.current?.getBoundingClientRect() ?? null,
    [],
  )

  const { items, choiceById } = useMemo(() => {
    const entries: MenuEntry[] = []
    const choices = new Map<string, ModelSelection>()
    for (const group of state.groups) {
      entries.push({ type: 'label', id: `label:${group.id}`, text: group.name })
      for (const model of group.models) {
        const id = `${group.id}:${model.id}`
        const selection: ModelSelection = {
          provider: group.id,
          model: model.id,
          ...(model.reasoning?.defaultEffort === undefined
            ? {}
            : { reasoningEffort: model.reasoning.defaultEffort }),
        }
        choices.set(id, selection)
        entries.push({ id, label: model.name })
      }
    }
    return { items: entries, choiceById: choices }
  }, [state.groups])

  const selectedId = state.current === null
    ? undefined
    : `${state.current.provider}:${state.current.model}`

  const buttonClass = variant === 'toolbar'
    ? `${css.composerTrigger} ${css.composerTriggerToolbar}`
    : variant === 'pill'
      ? css.composerChipBlank
      : css.composerChip

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={buttonClass}
        disabled={locked || state.status === 'loading' || state.status === 'selecting'}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open)
        }}
      >
        <span className={variant === 'toolbar' ? css.composerTriggerLabel : css.composerChipLabel}>
          {modelSelectionLabel(state.current, state.groups)}
        </span>
        <IconChevronDownOutline14 size={12} aria-hidden />
      </button>
      <Menu
        open={open && !locked}
        anchor={null}
        items={items}
        selectedId={selectedId}
        side="top"
        portal
        getAnchorRect={getAnchorRect}
        onSelect={(id) => {
          const selection = choiceById.get(id)
          if (selection !== undefined) void select(selection)
          setOpen(false)
        }}
        onClose={() => { setOpen(false) }}
      />
    </>
  )
}
