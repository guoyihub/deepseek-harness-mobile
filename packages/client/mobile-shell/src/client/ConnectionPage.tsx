import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  IconAgentPresetOutline16,
  IconDataOutline16,
  IconGlobeOutline14,
  IconPersonalizationOutline16,
  IconSettingsOutline16,
  IconUserOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type {} from '@deepseek-ai/dsh-session-turn-outline/client'
import { verifyHostDescribe } from './pair-api.ts'
import { AgentPresetPickerModal } from './AgentPresetPickerModal.tsx'
import { useMobileConnection } from './MobileConnectionContext.tsx'
import { DefaultModelPickerModal } from './DefaultModelPickerModal.tsx'
import { DeviceLabelModal } from './DeviceLabelModal.tsx'
import { HostFingerprintBadge } from './HostFingerprintBadge.tsx'
import { HostSettingsDesktopHintModal } from './HostSettingsDesktopHintModal.tsx'
import { MobileSettingsCard } from './MobileSettingsCard.tsx'
import { MobileSettingsRow } from './MobileSettingsRow.tsx'
import { MobileSettingsSheet } from './MobileSettingsSheet.tsx'
import { SavedConnectionEmptyHint, SavedConnectionList } from './SavedConnectionList.tsx'
import { ThemePickerModal } from './ThemePickerModal.tsx'
import { PluginInventoryModal } from './PluginInventoryModal.tsx'
import { SubagentModelModal } from './SubagentModelModal.tsx'
import { MobileReconnectBanner } from './MobileReconnectBanner.tsx'
import {
  adoptMobileBusyEnterFromHost,
  readMobileBusyEnter,
  writeMobileBusyEnter,
} from './mobile-busy-enter.ts'
import { mobileSubmissionPolicy } from './mobile-submission-policy.ts'
import type { BusyEnterBehavior } from '@deepseek-ai/dsh-client-ui-conversation/src/submission-settings.ts'
import {
  clearPairingStorage,
  connectionHistoryId,
  readMobileConnectionHistory,
  readStoredFingerprint,
  readStoredHostBase,
  removeMobileConnectionHistory,
  resolveDeviceLabel,
  touchMobileConnectionHistory,
  writePairingResult,
  writeStoredDeviceLabel,
  type SavedMobileConnection,
} from './mobile-session.ts'
import {
  applyMobileFontSize,
  applyMobileTheme,
  readMobileFontSize,
  readMobileThemePreference,
  writeMobileFontSize,
  writeMobileThemePreference,
  type MobileFontSize,
  type MobileThemePreference,
} from './mobile-theme.ts'
import {
  readMobileLanguagePreference,
  type MobileLanguagePreference,
} from './mobile-language.ts'
import { readStoredServerUrl } from './mobile-server-config.ts'
import { modelIdLabel } from './mobile-model-label.ts'
import { agentPresetDisplayLabel, type AgentPresetLabelSource } from './mobile-host-preset-label.ts'
import { mobileConversationT, useMobileLanguage, useSetMobileLanguage } from './mobile-locale.ts'
import { getMobileAgentPresets } from './mobile-host-metadata-cache.ts'
import { isNativeShell } from '@deepseek-ai/dsh-client-connection/client'
import css from './mobile-shell.module.css'

/** Props for {@link ConnectionPage}. */
export interface ConnectionPageProps {
  /** Navigate back to home. */
  onBack: () => void
  /** Navigate to the scan pairing flow. */
  onPair: () => void
  /** Open the native shell server URL editor. */
  onEditServer?: () => void
}

const THEME_OPTION_IDS = ['light', 'dark', 'system'] as const satisfies readonly MobileThemePreference[]

function themeLabel(theme: MobileThemePreference): string {
  const key = theme === 'light'
    ? 'theme.light'
    : theme === 'dark'
      ? 'theme.dark'
      : 'theme.system'
  return mobileConversationT(key)
}

function themeOptions(): Array<{ id: MobileThemePreference; label: string }> {
  return THEME_OPTION_IDS.map(id => ({
    id,
    label: themeLabel(id),
  }))
}

function shortenUrl(url: string, max = 28): string {
  if (url.length <= max) return url
  return `${url.slice(0, max - 1)}…`
}

/** Host settings sections that are desktop-only on mobile. */
type HostSettingsHint = 'general'

/**
 * Connection settings sheet using the consumer mobile settings list pattern.
 * @param props - navigation callbacks.
 */
export function ConnectionPage({ onBack, onPair, onEditServer }: ConnectionPageProps): JSX.Element {
  useMobileLanguage()
  const setLanguagePreference = useSetMobileLanguage()
  const {
    paired,
    hostBase,
    hostDescription,
    connectionState,
    revoked,
    error,
    disconnect,
    reloadPairing,
    sessions,
    createSession,
    refreshHostDescription,
  } = useMobileConnection()
  const [theme, setTheme] = useState<MobileThemePreference>(() => readMobileThemePreference())
  const [fontSize, setFontSize] = useState<MobileFontSize>(() => readMobileFontSize())
  const [language, setLanguage] = useState<MobileLanguagePreference>(() => readMobileLanguagePreference())
  const [languageModalOpen, setLanguageModalOpen] = useState(false)
  const [fontModalOpen, setFontModalOpen] = useState(false)
  const [pluginsModalOpen, setPluginsModalOpen] = useState(false)
  const [subagentModalOpen, setSubagentModalOpen] = useState(false)
  const [deviceLabel, setDeviceLabel] = useState(() => resolveDeviceLabel())
  const [savedConnections, setSavedConnections] = useState(() => readMobileConnectionHistory())
  const [reconnectingId, setReconnectingId] = useState<string | undefined>(undefined)
  const [reconnectError, setReconnectError] = useState<string | undefined>(undefined)
  const [deviceModalOpen, setDeviceModalOpen] = useState(false)
  const [themeModalOpen, setThemeModalOpen] = useState(false)
  const [modelModalOpen, setModelModalOpen] = useState(false)
  const [presetModalOpen, setPresetModalOpen] = useState(false)
  const [enterModalOpen, setEnterModalOpen] = useState(false)
  const [enterBehavior, setEnterBehavior] = useState<BusyEnterBehavior>(() => readMobileBusyEnter())
  const [hostSettingsHint, setHostSettingsHint] = useState<HostSettingsHint | undefined>(undefined)
  const [defaultPresetLabel, setDefaultPresetLabel] = useState<string | undefined>(undefined)
  const closeSheetRef = useRef<(afterClose?: () => void) => void>(() => {})
  const serverUrl = isNativeShell() ? readStoredServerUrl() : undefined

  const closeThen = useCallback((action: () => void): void => {
    closeSheetRef.current(action)
  }, [])

  const resolveModelSessionId = useCallback(async () => {
    if (sessions.length > 0) return sessions[0]?.sessionId
    return createSession()
  }, [createSession, sessions])

  const modelDisplayLabel = modelIdLabel(hostDescription?.model)

  const activeSavedId = useMemo(() => {
    if (!paired) return undefined
    const fingerprint = readStoredFingerprint()
    const base = hostBase ?? readStoredHostBase()
    if (fingerprint === undefined || base === undefined) return undefined
    return connectionHistoryId(fingerprint, base)
  }, [hostBase, paired, connectionState])

  const activeFingerprint = readStoredFingerprint()

  const refreshSavedConnections = useCallback((): void => {
    setSavedConnections(readMobileConnectionHistory())
  }, [])

  useEffect(() => {
    refreshSavedConnections()
  }, [refreshSavedConnections])

  const refreshDefaultPresetLabel = useCallback((): void => {
    if (!paired) {
      setDefaultPresetLabel(undefined)
      return
    }
    void (async () => {
      try {
        const response = await getMobileAgentPresets()
        const preset = (response.presets as readonly (AgentPresetLabelSource & { isDefault?: boolean })[])
          .find(item => item.isDefault === true)
        setDefaultPresetLabel(preset === undefined ? undefined : agentPresetDisplayLabel(preset))
      } catch {
        setDefaultPresetLabel(undefined)
      }
    })()
  }, [paired])

  useEffect(() => {
    refreshDefaultPresetLabel()
  }, [refreshDefaultPresetLabel, connectionState])

  useEffect(() => {
    if (!paired) return
    void adoptMobileBusyEnterFromHost().then((behavior) => {
      setEnterBehavior(behavior)
      mobileSubmissionPolicy.setBusyEnter(behavior)
    })
  }, [connectionState, paired])

  const enterBehaviorLabel = enterBehavior === 'queue'
    ? mobileConversationT('settings.enter.queue')
    : mobileConversationT('settings.enter.steer')

  const openHostSetting = useCallback((action: () => void): void => {
    if (!paired) return
    action()
  }, [paired])

  const onThemeChange = (next: MobileThemePreference): void => {
    setTheme(next)
    writeMobileThemePreference(next)
    applyMobileTheme(next)
  }

  const onFontChange = (next: MobileFontSize): void => {
    setFontSize(next)
    writeMobileFontSize(next)
    applyMobileFontSize(next)
  }

  const languageLabel = language === 'en'
    ? mobileConversationT('language.en')
    : language === 'zh'
      ? mobileConversationT('language.zh')
      : mobileConversationT('language.system')
  const fontLabel = fontSize === 13
    ? mobileConversationT('font.small')
    : fontSize === 16
      ? mobileConversationT('font.large')
      : mobileConversationT('font.medium')

  const onDisconnect = (): void => {
    clearPairingStorage()
    disconnect()
    reloadPairing()
  }

  const onReconnectSaved = useCallback(async (entry: SavedMobileConnection): Promise<void> => {
    setReconnectError(undefined)
    setReconnectingId(entry.id)
    try {
      writePairingResult(entry.hostBase, entry.sessionToken, entry.deviceId, entry.fingerprint)
      await verifyHostDescribe(entry.hostBase, entry.sessionToken)
      touchMobileConnectionHistory(entry.id)
      refreshSavedConnections()
      reloadPairing()
    } catch (reconnectFailure) {
      const message = reconnectFailure instanceof Error
        ? reconnectFailure.message
        : String(reconnectFailure)
      setReconnectError(message)
    } finally {
      setReconnectingId(undefined)
    }
  }, [refreshSavedConnections, reloadPairing])

  const statusLabel = revoked
    ? mobileConversationT('connection.revoked')
    : connectionState === 'connecting'
      ? mobileConversationT('connection.reconnecting')
      : connectionState === 'connected'
        ? mobileConversationT('connection.connected')
        : paired
          ? mobileConversationT('connection.error')
          : mobileConversationT('connection.disconnected')

  const statusOnline = !revoked && connectionState === 'connected'
  const hostName = hostDescription?.provider ?? 'DSH Host'
  const profileSubtitle = paired
    ? (hostBase ?? mobileConversationT('connection.unknownAddress'))
    : mobileConversationT('connection.notPaired')

  const panelError = reconnectError ?? (revoked ? mobileConversationT('connection.revokedMessage') : error)

  return (
    <MobileSettingsSheet
      title={mobileConversationT('connection.title')}
      onClose={onBack}
      onCloseControl={(close) => { closeSheetRef.current = close }}
    >
      <div className={css.mSetPage}>
        {panelError !== undefined && panelError !== '' && (
          <div className={css.mSetAlert} role="alert">{panelError}</div>
        )}
        <MobileReconnectBanner />

        <section className={css.mSetProfile} aria-label={mobileConversationT('connection.current')}>
          <div className={css.mSetAvatar} data-online={statusOnline || undefined}>
            {activeFingerprint !== undefined ? (
              <HostFingerprintBadge fingerprint={activeFingerprint} active={statusOnline} />
            ) : (
              <IconUserOutline16 size={28} aria-hidden />
            )}
          </div>
          <div className={css.mSetProfileNameRow}>
            <h2 className={css.mSetProfileName}>{paired ? hostName : mobileConversationT('connection.disconnected')}</h2>
            {paired && (
              <span className={css.mSetProfileBadge} data-online={statusOnline || undefined}>
                {statusLabel}
              </span>
            )}
          </div>
          <p className={css.mSetProfileSub}>{profileSubtitle}</p>
          {activeFingerprint !== undefined && (
            <p className={css.mSetProfileSub}>{mobileConversationT('connection.fingerprint')} {activeFingerprint.toUpperCase()}</p>
          )}
          <div className={css.mSetProfileActions}>
            <button
              type="button"
              className={css.mSetProfileActionBtn}
              onClick={() => { closeThen(onPair) }}
            >
              {paired ? mobileConversationT('connection.rescan') : mobileConversationT('connection.scan')}
            </button>
            {paired && (
              <button
                type="button"
                className={`${css.mSetProfileActionBtn} ${css.mSetProfileActionBtnDestructive}`}
                onClick={onDisconnect}
              >
                {mobileConversationT('connection.disconnect')}
              </button>
            )}
          </div>
        </section>

        {savedConnections.length === 0
          ? <SavedConnectionEmptyHint />
          : (
            <section className={css.mSetSection}>
              <h3 className={css.mSetSectionLabel}>{mobileConversationT('connection.saved')}</h3>
              <SavedConnectionList
                entries={savedConnections}
                activeId={activeSavedId}
                reconnectingId={reconnectingId}
                onReconnect={(entry) => { void onReconnectSaved(entry) }}
                onRemove={(id) => {
                  removeMobileConnectionHistory(id)
                  refreshSavedConnections()
                }}
              />
            </section>
          )}

        <MobileSettingsCard>
          <MobileSettingsRow
            icon={<IconUserOutline16 size={22} />}
            label={mobileConversationT('settings.deviceName')}
            value={deviceLabel}
            onClick={() => { setDeviceModalOpen(true) }}
          />
          <MobileSettingsRow
            icon={<IconPersonalizationOutline16 size={22} />}
            label={mobileConversationT('settings.appearance')}
            value={themeLabel(theme)}
            onClick={() => { setThemeModalOpen(true) }}
          />
          <MobileSettingsRow
            icon={<IconPersonalizationOutline16 size={22} />}
            label={mobileConversationT('settings.fontSize')}
            value={fontLabel}
            onClick={() => { setFontModalOpen(true) }}
          />
          <MobileSettingsRow
            icon={<IconGlobeOutline14 size={22} />}
            label={mobileConversationT('settings.language')}
            value={languageLabel}
            onClick={() => { setLanguageModalOpen(true) }}
          />
          <MobileSettingsRow
            icon={<IconSettingsOutline16 size={22} />}
            label={mobileConversationT('settings.enter.title')}
            value={enterBehaviorLabel}
            onClick={() => { setEnterModalOpen(true) }}
          />
        </MobileSettingsCard>

        <section className={css.mSetSection}>
          <h3 className={css.mSetSectionLabel}>{mobileConversationT('settings.host')}</h3>
          <MobileSettingsCard>
            <MobileSettingsRow
              icon={<IconSettingsOutline16 size={22} />}
              label={mobileConversationT('settings.general')}
              value={paired ? undefined : mobileConversationT('connection.connectFirst')}
              disabled={!paired}
              onClick={() => {
                openHostSetting(() => { setHostSettingsHint('general') })
              }}
            />
            <MobileSettingsRow
              icon={<IconDataOutline16 size={22} />}
              label={mobileConversationT('settings.model')}
              value={paired ? modelDisplayLabel : mobileConversationT('connection.connectFirst')}
              disabled={!paired}
              onClick={() => {
                openHostSetting(() => { setModelModalOpen(true) })
              }}
            />
            <MobileSettingsRow
              icon={<IconDataOutline16 size={22} />}
              label={mobileConversationT('subagent.title')}
              value={paired ? undefined : mobileConversationT('connection.connectFirst')}
              disabled={!paired}
              onClick={() => {
                openHostSetting(() => { setSubagentModalOpen(true) })
              }}
            />
            <MobileSettingsRow
              icon={<IconPersonalizationOutline16 size={22} />}
              label={mobileConversationT('settings.plugins')}
              value={paired ? undefined : mobileConversationT('connection.connectFirst')}
              disabled={!paired}
              onClick={() => {
                openHostSetting(() => { setPluginsModalOpen(true) })
              }}
            />
            <MobileSettingsRow
              icon={<IconAgentPresetOutline16 size={22} />}
              label={mobileConversationT('settings.agentPreset')}
              value={paired ? (defaultPresetLabel ?? mobileConversationT('common.loading')) : mobileConversationT('connection.connectFirst')}
              disabled={!paired}
              onClick={() => {
                openHostSetting(() => { setPresetModalOpen(true) })
              }}
            />
          </MobileSettingsCard>
        </section>

        {serverUrl !== undefined && onEditServer !== undefined && (
          <MobileSettingsCard>
            <MobileSettingsRow
              icon={<IconGlobeOutline14 size={22} />}
              label={mobileConversationT('settings.mobileServer')}
              value={shortenUrl(serverUrl)}
              onClick={() => { closeThen(onEditServer) }}
            />
          </MobileSettingsCard>
        )}

      </div>

      <DeviceLabelModal
        open={deviceModalOpen}
        initialLabel={deviceLabel}
        onClose={() => { setDeviceModalOpen(false) }}
        onConfirm={(label) => {
          setDeviceLabel(label)
          writeStoredDeviceLabel(label)
        }}
      />

      <ThemePickerModal
        open={themeModalOpen}
        value={theme}
        options={themeOptions()}
        onClose={() => { setThemeModalOpen(false) }}
        onSelect={(value) => { onThemeChange(value as MobileThemePreference) }}
      />
      <ThemePickerModal
        open={fontModalOpen}
        title={mobileConversationT('settings.fontSize')}
        value={String(fontSize)}
        options={[
          { id: '13', label: mobileConversationT('font.small') },
          { id: '14', label: mobileConversationT('font.medium') },
          { id: '16', label: mobileConversationT('font.large') },
        ]}
        onClose={() => { setFontModalOpen(false) }}
        onSelect={(value) => { onFontChange(Number(value) as MobileFontSize) }}
      />
      <ThemePickerModal
        open={languageModalOpen}
        title={mobileConversationT('settings.language')}
        value={language}
        options={[
          { id: 'system', label: mobileConversationT('language.system') },
          { id: 'zh', label: mobileConversationT('language.zh') },
          { id: 'en', label: mobileConversationT('language.en') },
        ]}
        onClose={() => { setLanguageModalOpen(false) }}
        onSelect={(value) => {
          const preference = value as MobileLanguagePreference
          setLanguage(preference)
          setLanguagePreference(preference)
        }}
      />
      <ThemePickerModal
        open={enterModalOpen}
        title={mobileConversationT('settings.enter.title')}
        value={enterBehavior}
        options={[
          { id: 'queue', label: mobileConversationT('settings.enter.queue') },
          { id: 'steer', label: mobileConversationT('settings.enter.steer') },
        ]}
        onClose={() => { setEnterModalOpen(false) }}
        onSelect={(value) => {
          const behavior = value as BusyEnterBehavior
          setEnterBehavior(behavior)
          mobileSubmissionPolicy.setBusyEnter(behavior)
          void writeMobileBusyEnter(behavior)
        }}
      />

      <DefaultModelPickerModal
        open={modelModalOpen}
        onClose={() => { setModelModalOpen(false) }}
        resolveSessionId={resolveModelSessionId}
        onSelected={() => { void refreshHostDescription() }}
      />

      <AgentPresetPickerModal
        open={presetModalOpen}
        onClose={() => { setPresetModalOpen(false) }}
        onSelected={refreshDefaultPresetLabel}
      />

      <PluginInventoryModal
        open={pluginsModalOpen}
        onClose={() => { setPluginsModalOpen(false) }}
      />
      <SubagentModelModal
        open={subagentModalOpen}
        onClose={() => { setSubagentModalOpen(false) }}
      />

      <HostSettingsDesktopHintModal
        open={hostSettingsHint === 'general'}
        title={mobileConversationT('settings.general')}
        body={mobileConversationT('settings.generalHint')}
        onClose={() => { setHostSettingsHint(undefined) }}
      />
    </MobileSettingsSheet>
  )
}
