import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ModelProviderGroup,
  ModelSelection,
  SessionId,
} from '@deepseek-ai/dsh-client-connection/client'
import { IconChevronDownOutline14, Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import type { MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives'
import { mobileApi } from './mobile-api-client.ts'
import css from './mobile-shell.module.css'

/** Props for {@link MobileModelSelect}. */
export interface MobileModelSelectProps {
  sessionId: SessionId
  locked: boolean
  /** Inline chip in the composer toolbar, or desktop-style trigger. */
  variant?: 'chip' | 'pill' | 'toolbar' | undefined
}

interface ModelDirectoryState {
  current: ModelSelection | null
  groups: readonly ModelProviderGroup[]
  status: 'idle' | 'loading' | 'ready' | 'selecting' | 'error'
}

function modelLabel(
  selection: ModelSelection | null,
  groups: readonly ModelProviderGroup[],
): string {
  if (selection === null) return 'Model'
  for (const group of groups) {
    if (group.id !== selection.provider) continue
    const model = group.models.find(item => item.id === selection.model)
    if (model === undefined) continue
    const effort = selection.reasoningEffort ?? model.reasoning?.defaultEffort
    const effortName = effort === undefined
      ? undefined
      : model.reasoning?.efforts.find(level => level.id === effort)?.name ?? effort
    return effortName === undefined ? model.name : `${model.name} ${effortName}`
  }
  return `${selection.provider}/${selection.model}`
}

/**
 * Mobile model picker backed by session.models and session.selectModel RPC.
 * @param props - session id and lock state.
 */
export function MobileModelSelect({
  sessionId,
  locked,
  variant = 'chip',
}: MobileModelSelectProps): JSX.Element {
  const [state, setState] = useState<ModelDirectoryState>({
    current: null,
    groups: [],
    status: 'idle',
  })
  const [open, setOpen] = useState(false)
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
  }, [locked])

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
          setOpen(value => !value)
          if (!open) void load()
        }}
      >
        <span className={variant === 'toolbar' ? css.composerTriggerLabel : css.composerChipLabel}>
          {modelLabel(state.current, state.groups)}
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
