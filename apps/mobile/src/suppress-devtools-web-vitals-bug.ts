/**
 * Chrome/Edge DevTools injects an embedded web-vitals CLS observer (`VM*` scripts)
 * that can read cleared performance entries and throw on `entry.startTime`.
 * @see https://github.com/GoogleChrome/web-vitals/issues/792
 * @see https://github.com/angular/angular/issues/70464
 * @returns disposer for the window error listener.
 */
export function suppressDevToolsWebVitalsBug(): () => void {
  if (!import.meta.env.DEV) return () => {}

  const onError = (event: ErrorEvent): void => {
    if (!event.message.includes("reading 'startTime'")) return
    const source = event.filename ?? ''
    if (!/^VM\d+:/.test(source)) return
    event.preventDefault()
  }

  window.addEventListener('error', onError)
  return () => { window.removeEventListener('error', onError) }
}
