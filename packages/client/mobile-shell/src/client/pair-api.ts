/** Mobile pairing HTTP helpers (plain JSON, not RPC envelope). */

import {
  createWebConnectionRpc,
  normalizeHostBaseUrl,
  resolveMobileApiBase,
} from '@deepseek-ai/dsh-client-connection/client'

/** Parsed QR or manual pairing input. */
export interface PairingInput {
  /** Host base URL (`http://host:port` for M1 plain-HTTP Host). */
  baseUrl: string
  /** pairToken from QR payload. */
  pairToken: string
  /** Whether the Host requires a shared pair password. */
  passwordRequired: boolean
}

/** Host pairing policy visible to phones on the LAN. */
export interface PairPolicy {
  /** Whether the phone must collect a pair password. */
  passwordRequired: boolean
}

/** Pairing options shared by token and short-code flows. */
export interface PairAttemptOptions {
  /** Shared pair password when the Host requires one. */
  pairPassword?: string
}

/** Manual host/port/short-code pairing input. */
export interface ShortCodePairingInput {
  /** Host base URL. */
  baseUrl: string
  /** Six-digit pairing code from desktop QR page. */
  shortCode: string
}

/** Successful pair API response. */
export interface PairResponse {
  sessionToken: string
  deviceId: string
  hostDisplayName: string
  fingerprint: string
  scopes: readonly string[]
  expiresAt: string
}

/** Phone-side poll outcome while strict confirmation is in flight. */
export type DevicePairStatus =
  | { status: 'pending' }
  | { status: 'ready'; value: PairResponse }
  | { status: 'denied' }
  | { status: 'expired' }
  | { status: 'not-found' }

/** Thrown when strict mode requires desktop confirmation before session issuance. */
export class PairPendingError extends Error {
  /** Pending device id for status polling. */
  readonly deviceId: string
  /** Host base URL used for the pair attempt. */
  readonly baseUrl: string

  /**
   * @param deviceId - pending device id from the 409 response.
   * @param baseUrl - Host base URL for follow-up polling.
   */
  constructor(deviceId: string, baseUrl: string) {
    super('pending desktop confirmation')
    this.name = 'PairPendingError'
    this.deviceId = deviceId
    this.baseUrl = baseUrl
  }
}

/** Options for strict-mode polling after a 409 response. */
export interface PollPairStatusOptions {
  /** Maximum wait in milliseconds before timing out. */
  timeoutMs?: number
  /** Initial poll delay in milliseconds. */
  initialDelayMs?: number
  /** Maximum delay between polls in milliseconds. */
  maxDelayMs?: number
}

const DEFAULT_POLL_OPTIONS: Required<PollPairStatusOptions> = {
  timeoutMs: 120_000,
  initialDelayMs: 800,
  maxDelayMs: 4000,
}

/**
 * Parse a QR URL or raw token pair into pairing input.
 * @param raw - scanned URL or `host:port token` manual form.
 * @returns parsed input, or undefined when unrecognizable.
 */
export function parsePairingInput(raw: string): PairingInput | undefined {
  const trimmed = raw.trim()
  try {
    const url = new URL(trimmed)
    const pairToken = url.searchParams.get('t') ?? undefined
    if (pairToken === undefined) return undefined
    const passwordRequired = url.searchParams.get('p') === '1'
    return {
      baseUrl: normalizeHostBaseUrl(`${url.protocol}//${url.host}`),
      pairToken,
      passwordRequired,
    }
  } catch {
    const [hostPort, pairToken] = trimmed.split(/\s+/)
    if (hostPort === undefined || pairToken === undefined) return undefined
    const baseUrl = hostPort.includes('://') ? hostPort : `http://${hostPort}`
    return {
      baseUrl: normalizeHostBaseUrl(baseUrl),
      pairToken,
      passwordRequired: false,
    }
  }
}

/**
 * Read whether the Host currently requires a pair password.
 * @param baseUrl - Host base URL.
 */
export async function fetchPairPolicy(baseUrl: string): Promise<PairPolicy> {
  const response = await globalThis.fetch(`${resolveMobileApiBase(baseUrl)}/api/mobile/pair/policy`)
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`读取连接策略失败 (${String(response.status)}): ${detail}`)
  }
  return await response.json() as PairPolicy
}

/**
 * Build a Host base URL from host and port fields.
 * @param host - hostname or IP literal.
 * @param port - listen port.
 */
export function buildHostBaseUrl(host: string, port: string): string {
  const trimmedHost = host.trim()
  const trimmedPort = port.trim()
  if (trimmedHost === '' || trimmedPort === '') return ''
  const withScheme = trimmedHost.includes('://') ? trimmedHost : `http://${trimmedHost}`
  try {
    const url = new URL(withScheme)
    url.port = trimmedPort
    return normalizeHostBaseUrl(url.origin)
  } catch {
    return normalizeHostBaseUrl(`http://${trimmedHost}:${trimmedPort}`)
  }
}

async function readPairResponse(response: Response, baseUrl: string): Promise<PairResponse> {
  if (response.status === 409) {
    let body: unknown
    try {
      body = await response.json()
    } catch {
      throw new Error('桌面尚未确认此设备，请在电脑上点击「允许」')
    }
    const deviceId = typeof body === 'object' && body !== null && typeof (body as Record<string, unknown>).deviceId === 'string'
      ? (body as Record<string, string>).deviceId
      : undefined
    if (deviceId === undefined) throw new Error('桌面尚未确认此设备，请在电脑上点击「允许」')
    throw new PairPendingError(deviceId, baseUrl)
  }
  if (response.status === 401) {
    let body: unknown
    try {
      body = await response.json()
    } catch {
      throw new Error('连接密码错误或缺失')
    }
    const error = typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>).error
      : undefined
    if (error === 'pair password required') throw new Error('请输入连接密码')
    if (error === 'invalid pair password') throw new Error('连接密码错误')
    throw new Error('连接密码错误或缺失')
  }
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`配对失败 (${String(response.status)}): ${detail}`)
  }
  return await response.json() as PairResponse
}

/**
 * Exchange a pairToken for a sessionToken.
 * @param input - Host base URL and pairToken.
 * @param deviceLabel - user-visible phone label.
 * @returns pair response on success.
 */
export async function postPair(
  input: PairingInput,
  deviceLabel: string,
  options: PairAttemptOptions = {},
): Promise<PairResponse> {
  const response = await globalThis.fetch(`${resolveMobileApiBase(input.baseUrl)}/api/mobile/pair`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      pairToken: input.pairToken,
      deviceLabel,
      clientVersion: 'mobile/0.1.0',
      ...(options.pairPassword !== undefined ? { pairPassword: options.pairPassword } : {}),
    }),
  })
  return await readPairResponse(response, resolveMobileApiBase(input.baseUrl))
}

/**
 * Exchange a six-digit short code for a sessionToken.
 * @param input - Host base URL and short code.
 * @param deviceLabel - user-visible phone label.
 * @returns pair response on success.
 */
export async function postPairWithShortCode(
  input: ShortCodePairingInput,
  deviceLabel: string,
  options: PairAttemptOptions = {},
): Promise<PairResponse> {
  const response = await globalThis.fetch(`${resolveMobileApiBase(input.baseUrl)}/api/mobile/pair`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      shortCode: input.shortCode,
      deviceLabel,
      clientVersion: 'mobile/0.1.0',
      ...(options.pairPassword !== undefined ? { pairPassword: options.pairPassword } : {}),
    }),
  })
  return await readPairResponse(response, resolveMobileApiBase(input.baseUrl))
}

/**
 * Poll strict-mode pairing status for one device id.
 * @param baseUrl - Host base URL.
 * @param deviceId - pending device id from the 409 response.
 */
export async function fetchPairStatus(baseUrl: string, deviceId: string): Promise<DevicePairStatus> {
  const url = new URL('/api/mobile/pair/status', resolveMobileApiBase(baseUrl))
  url.searchParams.set('deviceId', deviceId)
  const response = await globalThis.fetch(url)
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`配对状态查询失败 (${String(response.status)}): ${detail}`)
  }
  return await response.json() as DevicePairStatus
}

/**
 * Poll until the desktop approves, denies, or the timeout elapses.
 * @param baseUrl - Host base URL.
 * @param deviceId - pending device id from the 409 response.
 * @param options - polling backoff and timeout tunables.
 */
export async function pollPairStatus(
  baseUrl: string,
  deviceId: string,
  options: PollPairStatusOptions = {},
): Promise<PairResponse> {
  const resolved = { ...DEFAULT_POLL_OPTIONS, ...options }
  const deadline = Date.now() + resolved.timeoutMs
  let delay = resolved.initialDelayMs
  while (Date.now() < deadline) {
    const status = await fetchPairStatus(baseUrl, deviceId)
    if (status.status === 'ready') return status.value
    if (status.status === 'denied') throw new Error('桌面拒绝了此设备的连接请求')
    if (status.status === 'expired' || status.status === 'not-found') {
      throw new Error('配对请求已过期，请重新扫码')
    }
    await sleep(delay)
    delay = Math.min(delay * 2, resolved.maxDelayMs)
  }
  throw new Error('等待桌面确认超时，请在电脑上点击「允许」后重试')
}

/**
 * Pair with automatic strict-mode polling when the Host returns 409.
 * @param input - Host base URL and pairToken.
 * @param deviceLabel - user-visible phone label.
 */
export async function pairWithPolling(
  input: PairingInput,
  deviceLabel: string,
  options: PairAttemptOptions = {},
): Promise<PairResponse> {
  try {
    return await postPair(input, deviceLabel, options)
  } catch (error) {
    if (!(error instanceof PairPendingError)) throw error
    return await pollPairStatus(error.baseUrl, error.deviceId)
  }
}

/**
 * Pair by short code with automatic strict-mode polling.
 * @param input - Host base URL and short code.
 * @param deviceLabel - user-visible phone label.
 */
export async function pairShortCodeWithPolling(
  input: ShortCodePairingInput,
  deviceLabel: string,
  options: PairAttemptOptions = {},
): Promise<PairResponse> {
  try {
    return await postPairWithShortCode(input, deviceLabel, options)
  } catch (error) {
    if (!(error instanceof PairPendingError)) throw error
    return await pollPairStatus(error.baseUrl, error.deviceId)
  }
}

/**
 * Verify Host RPC after pairing, using the official Connection envelope and
 * the newly issued pairing Bearer (not the desktop cookie).
 * @param _baseUrl - Host base URL; origin resolution still follows pairing storage.
 * @param sessionToken - issued opaque token.
 */
export async function verifyHostDescribe(_baseUrl: string, sessionToken: string): Promise<void> {
  const rpc = createWebConnectionRpc(async (input, init) => {
    const headers = new Headers(init.headers)
    headers.set('authorization', `Bearer ${sessionToken}`)
    return globalThis.fetch(input, { ...init, headers })
  })
  const result = await rpc.call('/api', 'session/modelCatalog', { args: {} })
  if (!result.ok) {
    throw new Error(`session/modelCatalog 失败: ${result.error.code}: ${result.error.message}`)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => { globalThis.setTimeout(resolve, ms) })
}
