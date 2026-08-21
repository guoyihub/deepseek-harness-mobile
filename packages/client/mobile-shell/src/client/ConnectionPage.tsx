import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  IconBrowseOutline16,
  IconGlobeOutline14,
  IconPersonalizationOutline16,
  IconRefreshOutline16,
  IconUserOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { verifyHostDescribe } from './pair-api.ts'
import { useMobileConnection } from './MobileConnectionContext.tsx'
import { DefaultModelPickerModal } from './DefaultModelPickerModal.tsx'
import { DeviceLabelModal } from './DeviceLabelModal.tsx'
import { HostFingerprintBadge } from './HostFingerprintBadge.tsx'
import { MobileSettingsCard } from './MobileSettingsCard.tsx'
import { MobileSettingsRow } from './MobileSettingsRow.tsx'
import { MobileSettingsSheet } from './MobileSettingsSheet.tsx'
import { SavedConnectionEmptyHint, SavedConnectionList } from './SavedConnectionList.tsx'
import { ThemePickerModal } from './ThemePickerModal.tsx'
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
  applyMobileTheme,
  readMobileThemePreference,
  writeMobileThemePreference,
  type MobileThemePreference,
} from './mobile-theme.ts'
import { readStoredServerUrl } from './mobile-server-config.ts'
import { modelIdLabel } from './mobile-model-label.ts'
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

const THEME_OPTIONS = [
  { id: 'light' as const, label: '浅色' },
  { id: 'dark' as const, label: '深色' },
  { id: 'system' as const, label: '跟随系统' },
]

function themeLabel(theme: MobileThemePreference): string {
  return THEME_OPTIONS.find(option => option.id === theme)?.label ?? '跟随系统'
}

function shortenUrl(url: string, max = 28): string {
  if (url.length <= max) return url
  return `${url.slice(0, max - 1)}…`
}

/**
 * Connection settings sheet using the consumer mobile settings list pattern.
 * @param props - navigation callbacks.
 */
export function ConnectionPage({ onBack, onPair, onEditServer }: ConnectionPageProps): JSX.Element {
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
  const [deviceLabel, setDeviceLabel] = useState(() => resolveDeviceLabel())
  const [savedConnections, setSavedConnections] = useState(() => readMobileConnectionHistory())
  const [reconnectingId, setReconnectingId] = useState<string | undefined>(undefined)
  const [reconnectError, setReconnectError] = useState<string | undefined>(undefined)
  const [deviceModalOpen, setDeviceModalOpen] = useState(false)
  const [themeModalOpen, setThemeModalOpen] = useState(false)
  const [modelModalOpen, setModelModalOpen] = useState(false)
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

  const onThemeChange = (next: MobileThemePreference): void => {
    setTheme(next)
    writeMobileThemePreference(next)
    applyMobileTheme(next)
  }

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
    ? '已吊销'
    : connectionState === 'reconnecting'
      ? '重连中'
      : connectionState === 'connected'
        ? '已连接'
        : paired
          ? '连接异常'
          : '未连接'

  const statusOnline = !revoked && connectionState === 'connected'
  const hostName = hostDescription?.provider ?? 'DSH Host'
  const profileSubtitle = paired
    ? (hostBase ?? '未知地址')
    : '尚未连接桌面 Host'

  const panelError = reconnectError ?? (revoked ? '设备已被桌面吊销，请重新扫码连接' : error)

  return (
    <MobileSettingsSheet
      title="连接管理"
      onClose={onBack}
      onCloseControl={(close) => { closeSheetRef.current = close }}
    >
      <div className={css.mSetPage}>
        {panelError !== undefined && panelError !== '' && (
          <div className={css.mSetAlert} role="alert">{panelError}</div>
        )}

        <section className={css.mSetProfile} aria-label="当前连接">
          <div className={css.mSetAvatar} data-online={statusOnline || undefined}>
            {activeFingerprint !== undefined ? (
              <HostFingerprintBadge fingerprint={activeFingerprint} active={statusOnline} />
            ) : (
              <IconUserOutline16 size={28} aria-hidden />
            )}
          </div>
          <div className={css.mSetProfileNameRow}>
            <h2 className={css.mSetProfileName}>{paired ? hostName : '未连接'}</h2>
            {paired && (
              <span className={css.mSetProfileBadge} data-online={statusOnline || undefined}>
                {statusLabel}
              </span>
            )}
          </div>
          <p className={css.mSetProfileSub}>{profileSubtitle}</p>
          {activeFingerprint !== undefined && (
            <p className={css.mSetProfileSub}>指纹 {activeFingerprint.toUpperCase()}</p>
          )}
          <button type="button" className={css.mSetProfileBtn} onClick={() => { closeThen(onPair) }}>
            {paired ? '重新扫码连接' : '扫码连接电脑'}
          </button>
        </section>

        {paired && (
          <MobileSettingsCard>
            <MobileSettingsRow
              icon={<IconRefreshOutline16 size={22} />}
              label="断开连接"
              destructive
              showChevron={false}
              onClick={onDisconnect}
            />
          </MobileSettingsCard>
        )}

        {savedConnections.length === 0
          ? <SavedConnectionEmptyHint />
          : (
            <section className={css.mSetSection}>
              <h3 className={css.mSetSectionLabel}>已保存的连接</h3>
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
            label="设备名称"
            value={deviceLabel}
            onClick={() => { setDeviceModalOpen(true) }}
          />
          <MobileSettingsRow
            icon={<IconPersonalizationOutline16 size={22} />}
            label="外观"
            value={themeLabel(theme)}
            onClick={() => { setThemeModalOpen(true) }}
          />
          {paired && (
            <MobileSettingsRow
              icon={<IconBrowseOutline16 size={22} />}
              label="当前模型"
              value={modelDisplayLabel}
              onClick={() => { setModelModalOpen(true) }}
            />
          )}
        </MobileSettingsCard>

        {serverUrl !== undefined && onEditServer !== undefined && (
          <MobileSettingsCard>
            <MobileSettingsRow
              icon={<IconGlobeOutline14 size={22} />}
              label="Mobile 服务器"
              value={shortenUrl(serverUrl)}
              onClick={() => { closeThen(onEditServer) }}
            />
          </MobileSettingsCard>
        )}

        <MobileSettingsCard>
          <MobileSettingsRow
            icon={<IconBrowseOutline16 size={22} />}
            label="已授权"
            value="查看与继续任务"
            showChevron={false}
          />
          <MobileSettingsRow
            icon={<IconBrowseOutline16 size={22} />}
            label="未授权"
            value="系统设置（仅桌面）"
            showChevron={false}
          />
        </MobileSettingsCard>
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
        options={THEME_OPTIONS}
        onClose={() => { setThemeModalOpen(false) }}
        onSelect={onThemeChange}
      />

      <DefaultModelPickerModal
        open={modelModalOpen}
        onClose={() => { setModelModalOpen(false) }}
        resolveSessionId={resolveModelSessionId}
        onSelected={() => { void refreshHostDescription() }}
      />
    </MobileSettingsSheet>
  )
}
