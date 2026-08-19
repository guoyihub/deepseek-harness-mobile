import { readDeviceLabelCustomized, readStoredDeviceLabel } from './mobile-session.ts'

/** Default mobile device label before the user edits it. */
export const DEFAULT_DEVICE_LABEL = 'My Phone'

/**
 * Resolve the label shown in connection settings and sent at pair time.
 * @returns stored label when the user edited one, otherwise {@link DEFAULT_DEVICE_LABEL}.
 */
export function resolveDeviceLabel(): string {
  if (readDeviceLabelCustomized()) {
    return readStoredDeviceLabel() ?? DEFAULT_DEVICE_LABEL
  }
  return DEFAULT_DEVICE_LABEL
}

/**
 * Default device label for placeholders and empty input normalization.
 */
export function resolveDefaultDeviceLabel(): string {
  return DEFAULT_DEVICE_LABEL
}
