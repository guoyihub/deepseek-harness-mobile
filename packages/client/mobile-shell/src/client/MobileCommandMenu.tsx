import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'
import { IconPlusOutline16, Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import type { MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives'
import { mobileApi } from './mobile-api-client.ts'
import {
  findMobileCommand,
  isLeadingInputCommand,
  isSurfaceCommand,
  MOBILE_COMMANDS,
  type MobileCommandSurface,
} from './mobile-command-catalog.ts'
import { mobileConversationT } from './mobile-locale.ts'
import css from './mobile-shell.module.css'

/** Props for {@link MobileCommandMenu}. */
export interface MobileCommandMenuProps {
  sessionId: SessionId
  locked: boolean
  /** Composer card rect for portal placement; defaults to the trigger button. */
  menuAnchorRef?: RefObject<HTMLElement>
  /** Called when a leadingInput command should claim the composer. */
  onLeadingInput: (name: string) => void
  /** Open a dedicated composer surface (model / permission), like desktop popupSelect. */
  onOpenSurface: (surface: MobileCommandSurface) => void
  /** Called just before a bare slash command is submitted. */
  onCommandSubmit?: (() => void) | undefined
  /** Surface an admission/transport failure on the chat error strip. */
  onCommandError?: ((message: string) => void) | undefined
}

/**
 * Composer command launcher. Bare host commands execute immediately; commands
 * with `input` claim the composer; `surface` commands open the matching picker.
 * @param props - session id, lock state, and claim/submit callbacks.
 */
export function MobileCommandMenu({
  sessionId,
  locked,
  menuAnchorRef,
  onLeadingInput,
  onOpenSurface,
  onCommandSubmit,
  onCommandError,
}: MobileCommandMenuProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (locked) setOpen(false)
  }, [locked])

  const items = useMemo((): MenuEntry[] => {
    const entries: MenuEntry[] = [
      { type: 'label', id: 'label:commands', text: mobileConversationT('command.title') },
    ]
    for (const command of MOBILE_COMMANDS) {
      entries.push({
        id: command.name,
        label: (
          <span className={css.commandMenuItem}>
            <span className={css.commandMenuName}>{command.name}</span>
            <span className={css.commandMenuDesc}>{command.description}</span>
          </span>
        ),
      })
    }
    return entries
  }, [])

  const getAnchorRect = useCallback(
    () => menuAnchorRef?.current?.getBoundingClientRect()
      ?? anchorRef.current?.getBoundingClientRect()
      ?? null,
    [menuAnchorRef],
  )

  const runBareCommand = useCallback(async (name: string): Promise<void> => {
    setOpen(false)
    onCommandSubmit?.()
    try {
      const response = await mobileApi.commands.execute({
        sessionId,
        line: `/${name}`,
      })
      if (!response.result.ok) {
        onCommandError?.(response.result.error.message)
        return
      }
      if (!response.result.value.matched) {
        onCommandError?.(mobileConversationT('command.unknown', { name }))
      }
    } catch (error: unknown) {
      onCommandError?.(error instanceof Error ? error.message : String(error))
    }
  }, [onCommandError, onCommandSubmit, sessionId])

  const onSelect = useCallback((id: string): void => {
    if (id.startsWith('label:')) return
    const command = findMobileCommand(id)
    setOpen(false)
    if (command !== undefined && isSurfaceCommand(command)) {
      onOpenSurface(command.surface)
      return
    }
    if (command !== undefined && isLeadingInputCommand(command)) {
      onLeadingInput(command.name)
      return
    }
    void runBareCommand(id)
  }, [onLeadingInput, onOpenSurface, runBareCommand])

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={css.composerAdd}
        aria-label={mobileConversationT('input.commands')}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={locked}
        onClick={() => { setOpen(value => !value) }}
      >
        <IconPlusOutline16 size={14} aria-hidden />
      </button>
      <Menu
        open={open && !locked}
        anchor={null}
        items={items}
        side="top"
        portal
        compact
        getAnchorRect={getAnchorRect}
        onSelect={onSelect}
        onClose={() => { setOpen(false) }}
      />
    </>
  )
}
