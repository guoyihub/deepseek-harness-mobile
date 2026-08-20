import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { PermissionSelect as PermissionSelectValue } from '@deepseek-ai/dsh-permission-presets/client'
import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'
import { Menu, RiskConfirmation } from '@deepseek-ai/dsh-client-ui-primitives'
import type { MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives'
import { mobileApi } from './mobile-api-client.ts'
import { mobileConversationT, mobilePermissionLabel } from './mobile-locale.ts'
import css from './mobile-shell.module.css'

const FULL_ACCESS = 'danger-full-access'

const shieldOutline = 'M8.20554 0.899994L14.7901 3.36857V7.01026C14.7901 12 11.0466 14.2103 8.20554 15.3C5.36446 14.2103 1.62012 12 1.62012 7.01026V3.36857L8.20554 0.899994Z'

const permissionGlyphs = {
  'read-only': (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d={shieldOutline} stroke="currentColor" strokeWidth="1.31831" strokeLinejoin="round" />
      <path d="M12.1654 5.7552L8.9447 9.41475C8.73044 9.65816 8.53628 9.8804 8.35774 10.0423C8.1713 10.2114 7.94235 10.3717 7.64016 10.4254C7.48207 10.4535 7.32 10.4552 7.16151 10.4294C6.85843 10.3801 6.62728 10.2223 6.43836 10.0559C6.25752 9.89653 6.06037 9.67732 5.84264 9.43705L4.72925 8.20897L5.63557 7.38707L6.74897 8.61594C6.98603 8.87755 7.12974 9.03533 7.24673 9.13839C7.31033 9.19443 7.34485 9.21476 7.35823 9.22122C7.38068 9.22484 7.40352 9.22515 7.42593 9.22122C7.40522 9.22502 7.42893 9.23294 7.53583 9.136C7.65132 9.03126 7.79316 8.87139 8.02643 8.60638L11.2479 4.94763L12.1654 5.7552Z" fill="currentColor" />
    </svg>
  ),
  'workspace-write': (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8.08887 0.251709C8.20479 0.23085 8.32486 0.241168 8.43652 0.282959L15.0215 2.75171C15.2787 2.84819 15.4492 3.09414 15.4492 3.3689V7.0105C15.4492 7.10986 15.4441 7.2081 15.4414 7.30542C15.0285 7.07175 14.5905 6.87695 14.1309 6.73022V3.82495L8.20508 1.60327L2.2793 3.82495V7.0105C2.27936 9.7171 3.4745 11.5379 5.02734 12.7947C5.01025 12.9942 5 13.1962 5 13.4001C5.00001 13.7617 5.02722 14.1169 5.08008 14.4636C2.91555 13.0393 0.961014 10.752 0.960938 7.0105V3.3689C0.960938 3.09417 1.13146 2.84821 1.38867 2.75171L7.97461 0.282959L8.08887 0.251709Z" fill="currentColor" />
      <path d="M11.3525 5.64688V6.85688H5V5.64688H11.3525Z" fill="currentColor" />
      <path d="M9.5824 8.29376V9.50376H5V8.29376H9.5824Z" fill="currentColor" />
      <path d="M14.6647 15.6852H10.0338C10.3878 15.3751 10.7567 15.0517 11.0772 14.7706C11.2531 14.6164 11.4144 14.4746 11.5511 14.3547H14.6647V15.6852Z" fill="currentColor" />
      <path d="M8.14852 14.1308L7.33925 15.4976C7.22458 15.6912 7.42245 15.9194 7.63037 15.8333L9.09785 15.2254L15.0399 10.0719L14.0905 8.97733L8.14852 14.1308Z" fill="currentColor" />
    </svg>
  ),
  [FULL_ACCESS]: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d={shieldOutline} stroke="currentColor" strokeWidth="1.31831" strokeLinejoin="round" />
      <path d="M9.10094 4.5V8.75939H7.59888V4.5H9.10094Z" fill="currentColor" />
      <path d="M9.10094 9.8114V11.5H7.59888V9.8114H9.10094Z" fill="currentColor" />
    </svg>
  ),
} as Record<string, ReactNode>

function permissionGlyph(value: string): ReactNode | undefined {
  return permissionGlyphs[value]
}

function optionLabel(option: PermissionSelectValue['options'][number]): string {
  return mobilePermissionLabel(option.value, option.name)
}

/** Props for {@link MobilePermissionSelect}. */
export interface MobilePermissionSelectProps {
  sessionId: SessionId
  value: PermissionSelectValue | undefined
  locked: boolean
  /** When true, keep the menu open (composer + menu / toolbar share one surface). */
  open?: boolean | undefined
  /** Report menu open changes so the + menu can open this picker. */
  onOpenChange?: ((open: boolean) => void) | undefined
}

/**
 * Mobile permission preset picker backed by session.prompt slash commands.
 * Full access requires the same explicit risk acknowledgement as desktop.
 * @param props - session id, permissions projection, and lock state.
 */
export function MobilePermissionSelect({
  sessionId,
  value,
  locked,
  open: openProp,
  onOpenChange,
}: MobilePermissionSelectProps): JSX.Element | null {
  const [pick, setPick] = useState<string | null>(null)
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = openProp ?? uncontrolledOpen
  const setOpen = useCallback((next: boolean | ((current: boolean) => boolean)): void => {
    const resolved = typeof next === 'function' ? next(openProp ?? uncontrolledOpen) : next
    if (openProp === undefined) setUncontrolledOpen(resolved)
    onOpenChange?.(resolved)
  }, [onOpenChange, openProp, uncontrolledOpen])
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const [acknowledged, setAcknowledged] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!locked && value !== undefined) return
    setOpen(false)
    setAcknowledged(false)
    setConfirmation(null)
  }, [locked, setOpen, value])

  const runCommand = useCallback(async (line: string): Promise<boolean> => {
    const response = await mobileApi.commands.execute({ sessionId, line })
    return response.result.ok && response.result.value.matched
  }, [sessionId])

  const getAnchorRect = useCallback(
    () => anchorRef.current?.getBoundingClientRect() ?? null,
    [],
  )

  if (value === undefined) return null

  const currentValue = pick ?? value.currentValue
  const current = value.options.find(option => option.value === currentValue)
  const busy = pick !== null || confirmation !== null

  const items: MenuEntry[] = value.options
    .filter(option => option.value !== 'custom')
    .map((option) => {
      const icon = permissionGlyph(option.value)
      return { id: option.value, label: optionLabel(option), ...icon === undefined ? {} : { icon } }
    })

  const submit = (id: string): void => {
    setPick(id)
    void runCommand(`/permission ${id}`)
      .catch(() => false)
      .finally(() => { setPick(null) })
  }

  const choose = (id: string): void => {
    setOpen(false)
    if (id === value.currentValue) return
    if (id === FULL_ACCESS) {
      setAcknowledged(false)
      setConfirmation(id)
      return
    }
    submit(id)
  }

  const closeConfirmation = (): void => {
    setAcknowledged(false)
    setConfirmation(null)
  }

  const confirmFullAccess = (): void => {
    if (locked || !acknowledged || confirmation === null) return
    const id = confirmation
    closeConfirmation()
    submit(id)
  }

  const label = current === undefined
    ? mobilePermissionLabel(currentValue, currentValue)
    : optionLabel(current)

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={`${css.composerTrigger} ${css.composerTriggerToolbar} ${css.composerAccessIcon}`}
        aria-label={mobileConversationT('input.accessMode', { name: label })}
        title={current?.description}
        disabled={locked || busy}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => { setOpen(!open) }}
      >
        <span className={css.composerTriggerIcon} aria-hidden>
          {permissionGlyph(currentValue)}
        </span>
      </button>
      <Menu
        open={open && !locked}
        anchor={null}
        items={items}
        selectedId={currentValue}
        side="top"
        portal
        getAnchorRect={getAnchorRect}
        onSelect={choose}
        onClose={() => { setOpen(false) }}
      />
      <RiskConfirmation
        open={confirmation !== null}
        title={mobileConversationT('access.confirm.title')}
        description={mobileConversationT('access.confirm.description')}
        acknowledgeLabel={mobileConversationT('access.confirm.acknowledge')}
        cancelLabel={mobileConversationT('access.confirm.cancel')}
        confirmLabel={mobileConversationT('access.confirm.enable')}
        acknowledged={acknowledged}
        disabled={locked}
        onAcknowledgedChange={setAcknowledged}
        onCancel={closeConfirmation}
        onConfirm={confirmFullAccess}
      />
    </>
  )
}
