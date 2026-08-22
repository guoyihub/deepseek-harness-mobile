import { Capacitor } from '@capacitor/core'

/**
 * Hide the iOS keyboard accessory bar in Capacitor native shells.
 * Safari/PWA has no supported API; mobile-shell uses a readonly focus guard instead.
 */
export function configureNativeMobileKeyboard(): void {
  if (!Capacitor.isNativePlatform()) return
  void import('@capacitor/keyboard').then(({ Keyboard }) => {
    void Keyboard.setAccessoryBarVisible({ isVisible: false })
  })
}
