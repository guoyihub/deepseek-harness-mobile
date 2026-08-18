/**
 * Mobile shell node half — pairing UI ships in the browser bundle under `./client`.
 * Host web-app does not mount this package; apps/mobile imports it directly.
 */

/** Cordis plugin body — no host registrations for the standalone mobile PWA. */
export function apply(): void {}
