/** Re-export mobile pairing storage helpers from the connection client. */
export {
  MOBILE_STORAGE_KEYS,
  clearPairingStorage,
  readSessionToken,
  readStoredDeviceLabel,
  readStoredHostBase,
  resolveDefaultDeviceLabel,
  resolveDeviceLabel,
  writePairingResult,
  writeStoredDeviceLabel,
  writeStoredHostBase,
} from '@deepseek-ai/dsh-client-connection/client'
