/** DeepSeek Harness Mobile PWA shell exports. */

export { MobileApp } from './MobileApp.tsx'
export { MobilePairApp, PairPage } from './PairPage.tsx'
export { MobileConnectionProvider, useMobileConnection } from './MobileConnectionContext.tsx'
export { parsePairingInput, postPair, verifyHostDescribe } from './pair-api.ts'
export type { PairingInput, PairResponse } from './pair-api.ts'
