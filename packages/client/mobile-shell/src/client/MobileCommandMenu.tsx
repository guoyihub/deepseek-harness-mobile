import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type RefObject } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import {
  IconBrowseOutline16,
  IconChevronLeftOutline14,
  IconChevronRightOutline14,
  IconListPenOutline16,
  IconPlusOutline16,
  Menu,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives'
import { mobileApi } from './mobile-api-client.ts'
import {
  findMobileCommand,
  isLeadingInputCommand,
  isSurfaceCommand,
  MOBILE_COMMANDS,
  type MobileCommandSurface,
} from './mobile-command-catalog.ts'
import { IconCameraOutline16 } from './mobile-composer-menu-icons.tsx'
import { mobileConversationT } from './mobile-locale.ts'
import css from './mobile-shell.module.css'

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'

/** Composer add-menu panel: root actions or the slash-command catalog. */
type ComposerMenuPanel = 'root' | 'commands'

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
  /** Attach one image from the camera or photo library. */
  onAttachImage?: ((file: File) => void) | undefined
}

/**
 * Composer add launcher: root panel exposes commands, camera, and album; the
 * commands row drills into the slash-command catalog.
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
  onAttachImage,
}: MobileCommandMenuProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState<ComposerMenuPanel>('root')
  const anchorRef = useRef<HTMLButtonElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const albumInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (locked) setOpen(false)
  }, [locked])

  useEffect(() => {
    if (!open) setPanel('root')
  }, [open])

  const commandEntries = useMemo((): MenuEntry[] => {
    const entries: MenuEntry[] = [
      {
        id: 'action:back',
        label: mobileConversationT('nav.back'),
        icon: <IconChevronLeftOutline14 size={14} aria-hidden />,
      },
      { type: 'separator', id: 'sep:commands' },
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

  const rootEntries = useMemo((): MenuEntry[] => {
    const entries: MenuEntry[] = [
      {
        id: 'action:commands',
        label: (
          <span className={css.composerMenuDrillLabel}>
            <span className={css.composerMenuDrillLabelText}>{mobileConversationT('input.commands')}</span>
            <IconChevronRightOutline14 className={css.composerMenuDrillChevron} size={14} aria-hidden />
          </span>
        ),
        icon: <IconListPenOutline16 size={16} aria-hidden />,
      },
    ]
    if (onAttachImage !== undefined) {
      entries.push(
        {
          id: 'action:camera',
          label: mobileConversationT('input.camera'),
          icon: <IconCameraOutline16 size={16} aria-hidden />,
        },
        {
          id: 'action:album',
          label: mobileConversationT('input.album'),
          icon: <IconBrowseOutline16 size={16} aria-hidden />,
        },
      )
    }
    return entries
  }, [onAttachImage])

  const items = panel === 'commands' ? commandEntries : rootEntries

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

  const onFileChosen = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file !== undefined) onAttachImage?.(file)
  }, [onAttachImage])

  const onSelect = useCallback((id: string): void => {
    if (id.startsWith('label:')) return
    if (id === 'action:back') {
      setPanel('root')
      return
    }
    if (id === 'action:commands') {
      setPanel('commands')
      return
    }
    if (id === 'action:camera') {
      setOpen(false)
      cameraInputRef.current?.click()
      return
    }
    if (id === 'action:album') {
      setOpen(false)
      albumInputRef.current?.click()
      return
    }
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
      {onAttachImage !== undefined && (
        <>
          <input
            ref={cameraInputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            capture="environment"
            hidden
            onChange={onFileChosen}
          />
          <input
            ref={albumInputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            hidden
            onChange={onFileChosen}
          />
        </>
      )}
      <button
        ref={anchorRef}
        type="button"
        className={css.composerAdd}
        aria-label={mobileConversationT('input.addMenu')}
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
