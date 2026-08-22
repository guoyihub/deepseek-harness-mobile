import { Capacitor } from '@capacitor/core'

/**
 * Wire Android / native hardware back to the mobile shell navigation stack.
 * @returns disposer for the native back listener.
 */
export function configureNativeMobileBack(): () => void {
  if (!Capacitor.isNativePlatform()) return () => {}

  let disposed = false
  let removeListener: (() => void) | undefined

  void import('@capacitor/app').then(({ App }) => {
    if (disposed) return
    void App.addListener('backButton', () => {
      window.dispatchEvent(new Event('mobile-nav-back'))
    }).then((handle) => {
      if (disposed) {
        void handle.remove()
        return
      }
      removeListener = () => { void handle.remove() }
    })
  }).catch(() => {})

  return () => {
    disposed = true
    removeListener?.()
  }
}
