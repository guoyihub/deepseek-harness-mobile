/** Native shell server URL configuration helpers. */

import {
  normalizeMobileServerUrl,
  readStoredServerUrl,
  writeStoredServerUrl,
} from '@deepseek-ai/dsh-client-connection/client'

export { readStoredServerUrl, writeStoredServerUrl }

/**
 * Probe whether a Mobile deployment responds to the pairing policy endpoint.
 * @param rawUrl - user-entered server address.
 */
export async function probeMobileServerUrl(rawUrl: string): Promise<void> {
  const base = normalizeMobileServerUrl(rawUrl)
  if (base === '') throw new Error('请输入有效的服务器地址')
  const response = await globalThis.fetch(`${base}/api/mobile/pair/policy`)
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`无法连接 (${String(response.status)}): ${detail}`)
  }
}

/**
 * Validate, probe, and persist one Mobile server URL.
 * @param rawUrl - user-entered server address.
 * @returns normalized origin written to storage.
 */
export async function saveMobileServerUrl(rawUrl: string): Promise<string> {
  const base = normalizeMobileServerUrl(rawUrl)
  if (base === '') throw new Error('请输入有效的服务器地址')
  await probeMobileServerUrl(base)
  writeStoredServerUrl(base)
  return base
}
