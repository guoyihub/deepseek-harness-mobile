import type { KeyboardEvent } from 'react'
import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PermissionSelect as PermissionSelectValue } from '@deepseek-ai/dsh-permission-presets/client'
import { IconCloseFill14 } from '@deepseek-ai/dsh-client-ui-primitives'
import { MobileCommandMenu } from './MobileCommandMenu.tsx'
import type { MobileCommandSurface } from './mobile-command-catalog.ts'
import { beginMobileClaim, type MobileComposerClaim } from './mobile-composer-claim.ts'
import { syncMobileComposerTextareaHeight } from './mobile-composer-textarea-height.ts'
import { bindMobileEditableFocusWithoutScroll } from './mobile-editable-focus.ts'
import { mobileConversationT } from './mobile-locale.ts'
import { MobileModelSelect } from './MobileModelSelect.tsx'
import { MobilePermissionSelect } from './MobilePermissionSelect.tsx'
import { MobilePlanChip } from './MobilePlanChip.tsx'
import css from './mobile-shell.module.css'

/** Props for {@link MobileComposer}. */
export interface MobileComposerProps {
  sessionId: SessionId
  draft: string
  sending: boolean
  locked: boolean
  agentWorking: boolean
  stopping: boolean
  permissions: PermissionSelectValue | undefined
  /** Active leadingInput claim (`/plan`, `/goal`); undefined in plain mode. */
  claim: MobileComposerClaim | undefined
  /** Whether plan mode is the effective projection target. */
  planActive: boolean
  /** Whether a durable goal is currently set (for goal claim hint). */
  goalActive: boolean
  onDraftChange: (value: string) => void
  onClaimChange: (claim: MobileComposerClaim | undefined) => void
  onSend: () => void
  onStop: () => void
  /** Keep the transcript pinned after a slash command is submitted. */
  onCommandSubmit?: (() => void) | undefined
  /** Surface a command admission/transport failure. */
  onCommandError?: ((message: string) => void) | undefined
  /** Called after the draft field relayouts (multi-line grow/shrink). */
  onLayoutChange?: (() => void) | undefined
  /** Attach one image file from the album or camera. */
  onAttachImage?: ((file: File) => void) | undefined
  /** Preview URLs for pending composer images. */
  pendingImageUrls?: readonly string[]
  /** Remove one pending composer image by index. */
  onRemoveImage?: ((index: number) => void) | undefined
}

/**
 * Resolve the ghost hint / placeholder for the active claim or plan mode.
 * @param claim - optional leadingInput claim.
 * @param planActive - plan projection effective target.
 * @param goalActive - whether a goal projection is present.
 */
function composerHint(
  claim: MobileComposerClaim | undefined,
  planActive: boolean,
  goalActive: boolean,
): string {
  if (claim !== undefined) {
    if (claim.name === 'goal' && goalActive) {
      return mobileConversationT('hint.goal.active')
    }
    const key = `hint.${claim.name}`
    const translated = mobileConversationT(key)
    return translated === key ? mobileConversationT('placeholder.default') : translated
  }
  if (planActive) return mobileConversationT('placeholder.plan')
  return mobileConversationT('placeholder.default')
}

/**
 * Mobile composer card aligned with desktop InputBar chrome and leadingInput.
 * @param props - composer state and handlers.
 */
export function MobileComposer({
  sessionId,
  draft,
  sending,
  locked,
  agentWorking,
  stopping,
  permissions,
  claim,
  planActive,
  goalActive,
  onDraftChange,
  onClaimChange,
  onSend,
  onStop,
  onCommandSubmit,
  onCommandError,
  onLayoutChange,
  onAttachImage,
  pendingImageUrls = [],
  onRemoveImage,
}: MobileComposerProps): JSX.Element {
  const [modelOpen, setModelOpen] = useState(false)
  const [permissionOpen, setPermissionOpen] = useState(false)

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (!agentWorking) onSend()
    }
  }

  const primaryStops = agentWorking
  const primaryLabel = primaryStops
    ? mobileConversationT('input.stop')
    : mobileConversationT('input.send')

  const cardRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hint = composerHint(claim, planActive, goalActive)
  const claimed = claim !== undefined
  const textareaValue = claimed ? claim.args : draft

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (textarea === null) return
    syncMobileComposerTextareaHeight(textarea)
    onLayoutChange?.()
  }, [onLayoutChange, textareaValue])

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea === null) return
    return bindMobileEditableFocusWithoutScroll(textarea)
  }, [claimed])
  const sendDisabled = primaryStops
    ? stopping
    : sending || (!claimed && draft.trim() === '' && pendingImageUrls.length === 0)

  const onOpenSurface = (surface: MobileCommandSurface): void => {
    if (surface === 'model') {
      setPermissionOpen(false)
      setModelOpen(true)
      return
    }
    setModelOpen(false)
    setPermissionOpen(true)
  }

  return (
    <div ref={cardRef} className={css.composerCard}>
      {pendingImageUrls.length > 0 && (
        <div className={css.composerImageRail}>
          {pendingImageUrls.map((url, index) => (
            <button
              key={`${url}:${String(index)}`}
              type="button"
              className={css.composerImageThumb}
              onClick={() => { onRemoveImage?.(index) }}
              aria-label={mobileConversationT('input.removeImage')}
            >
              <img src={url} alt="" />
            </button>
          ))}
        </div>
      )}
      {claimed
        ? (
          <div className={css.composerClaimField}>
            <div className={css.composerClaimHeader}>
              <span className={css.composerClaimToken}>{claim.token.trimEnd()}</span>
              <button
                type="button"
                className={css.composerClaimClear}
                aria-label={mobileConversationT('input.clearClaim')}
                disabled={sending}
                onClick={() => { onClaimChange(undefined) }}
              >
                <IconCloseFill14 size={12} aria-hidden />
              </button>
            </div>
            <textarea
              ref={textareaRef}
              className={css.composerTextarea}
              value={claim.args}
              placeholder={hint}
              disabled={sending}
              rows={1}
              enterKeyHint="send"
              onChange={(event) => {
                onClaimChange({ ...claim, args: event.target.value })
              }}
              onKeyDown={onKeyDown}
            />
          </div>
        )
        : (
          <textarea
            ref={textareaRef}
            className={css.composerTextarea}
            value={draft}
            placeholder={hint}
            disabled={sending}
            rows={1}
            enterKeyHint="send"
            onChange={(event) => { onDraftChange(event.target.value) }}
            onKeyDown={onKeyDown}
          />
        )}
      <div className={css.composerRow}>
        <div className={css.composerTools}>
          {onAttachImage !== undefined && (
            <label className={css.composerAttach}>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                capture="environment"
                hidden
                disabled={locked || claimed}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (file !== undefined) onAttachImage(file)
                }}
              />
              <span aria-label={mobileConversationT('input.attachImage')}>+</span>
            </label>
          )}
          <MobileCommandMenu
            sessionId={sessionId}
            locked={locked || claimed}
            menuAnchorRef={cardRef}
            onLeadingInput={(name) => {
              onDraftChange('')
              onClaimChange(beginMobileClaim(name))
            }}
            onOpenSurface={onOpenSurface}
            onCommandSubmit={onCommandSubmit}
            onCommandError={onCommandError}
          />
          <div className={css.composerModes}>
            {planActive && (
              <MobilePlanChip
                sessionId={sessionId}
                locked={locked}
                onCommandSubmit={onCommandSubmit}
                onCommandError={onCommandError}
              />
            )}
            <MobilePermissionSelect
              sessionId={sessionId}
              value={permissions}
              locked={locked}
              open={permissionOpen}
              onOpenChange={setPermissionOpen}
            />
          </div>
        </div>
        <div className={css.composerTrailing}>
          <MobileModelSelect
            sessionId={sessionId}
            locked={locked}
            variant="toolbar"
            open={modelOpen}
            onOpenChange={setModelOpen}
          />
          <button
            type="button"
            className={css.composerSend}
            disabled={sendDisabled}
            aria-label={primaryLabel}
            onClick={primaryStops ? onStop : onSend}
          >
            {primaryStops ? (
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
                <rect x="3" y="3" width="10" height="10" rx="3" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
                <path d="M8.3125 0.980183C8.66767 1.0531 8.97902 1.20418 9.2627 1.43233C9.48724 1.61297 9.73029 1.85793 9.97949 2.10714L14.707 6.83468L13.293 8.24874L9 3.95577V15.0417H7V3.95577L2.70703 8.24874L1.29297 6.83468L6.02051 2.10714C6.26971 1.85793 6.51277 1.61297 6.7373 1.43233C6.97662 1.23986 7.28445 1.04402 7.6875 0.980183C7.8973 0.947006 8.1031 0.95516 8.3125 0.980183Z" fill="currentColor" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
