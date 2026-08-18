/** HTTP handlers for /api/mobile/* plain-JSON routes. */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { URL } from 'node:url'
import QRCode from 'qrcode'
import {
  isLoopbackHostname,
  isTrustedApiRequest,
} from '@deepseek-ai/dsh-client-connection'
import type { MobilePairingStore, PairAttemptResult } from './store.ts'

/** Route registration dependencies. */
export interface MobileRouteDeps {
  /** Pairing state and token lifecycle. */
  store: MobilePairingStore
  /** Non-loopback authorities accepted by the trust fence. */
  trustedHosts: readonly string[]
  /** Resolved listen host literal. */
  bindHost: string
  /** Resolved listen port. */
  bindPort: number
}

/**
 * Register exact /api/mobile/* routes on the webserver.
 * @param deps - store, trust list, and bind facts.
 * @param register - webServer.register disposer factory.
 */
export function registerMobileRoutes(
  deps: MobileRouteDeps,
  register: (route: import('@deepseek-ai/dsh-host-webserver').WebRoute) => () => void,
): () => void {
  const disposers = [
    register({
      kind: 'exact',
      path: '/api/mobile/pair',
      handler: (req, res) => handlePair(req, res, deps),
    }),
    register({
      kind: 'exact',
      path: '/api/mobile/pair/confirm',
      handler: (req, res) => handleConfirm(req, res, deps),
    }),
    register({
      kind: 'exact',
      path: '/api/mobile/pair/deny',
      handler: (req, res) => handleDeny(req, res, deps),
    }),
    register({
      kind: 'exact',
      path: '/api/mobile/pair/status',
      handler: (req, res) => handlePairStatus(req, res, deps),
    }),
    register({
      kind: 'exact',
      path: '/api/mobile/pair/pending',
      handler: (req, res) => handlePairPending(req, res, deps),
    }),
    register({
      kind: 'exact',
      path: '/api/mobile/pair/qrcode',
      handler: (req, res) => handleQrcode(req, res, deps),
    }),
    register({
      kind: 'exact',
      path: '/api/mobile/pair/policy',
      handler: (req, res) => handlePairPolicy(req, res, deps),
    }),
    register({
      kind: 'exact',
      path: '/api/mobile/pair/settings',
      handler: (req, res) => handlePairSettings(req, res, deps),
    }),
    register({
      kind: 'exact',
      path: '/api/mobile/devices',
      handler: (req, res) => handleDevices(req, res, deps),
    }),
    register({
      kind: 'prefix',
      path: '/api/mobile/devices',
      handler: (req, res) => handleDeviceById(req, res, deps),
    }),
  ]
  return () => {
    for (const dispose of disposers) dispose()
  }
}

async function handlePair(req: IncomingMessage, res: ServerResponse, deps: MobileRouteDeps): Promise<void> {
  if (!isTrustedApiRequest(req, deps.trustedHosts)) {
    writeJson(res, 403, { error: 'forbidden' })
    return
  }
  if (req.method !== 'POST') {
    writeJson(res, 405, { error: 'method not allowed' })
    return
  }
  let body: unknown
  try {
    body = JSON.parse(await readBody(req))
  } catch {
    writeJson(res, 400, { error: 'invalid json' })
    return
  }
  const pairToken = stringField(body, 'pairToken')
  const shortCode = stringField(body, 'shortCode')
  const deviceLabel = stringField(body, 'deviceLabel') ?? 'Mobile device'
  const clientVersion = stringField(body, 'clientVersion') ?? 'mobile/unknown'
  const pairPassword = stringField(body, 'pairPassword')
  if (pairToken === undefined && shortCode === undefined) {
    writeJson(res, 400, { error: 'pairToken or shortCode required' })
    return
  }
  if (pairToken !== undefined) {
    writePairAttempt(res, deps.store.attemptPair(pairToken, deviceLabel, clientVersion, pairPassword))
    return
  }
  if (shortCode === undefined) {
    writeJson(res, 400, { error: 'pairToken or shortCode required' })
    return
  }
  writePairAttempt(res, deps.store.attemptPairByShortCode(shortCode, deviceLabel, clientVersion, pairPassword))
}

async function handleConfirm(req: IncomingMessage, res: ServerResponse, deps: MobileRouteDeps): Promise<void> {
  if (!isLoopbackRequest(req)) {
    writeJson(res, 403, { error: 'loopback only' })
    return
  }
  if (req.method !== 'POST') {
    writeJson(res, 405, { error: 'method not allowed' })
    return
  }
  let body: unknown
  try {
    body = JSON.parse(await readBody(req))
  } catch {
    writeJson(res, 400, { error: 'invalid json' })
    return
  }
  const deviceId = stringField(body, 'deviceId')
  if (deviceId === undefined) {
    writeJson(res, 400, { error: 'deviceId required' })
    return
  }
  const success = deps.store.confirmPending(deviceId)
  if (success === undefined) {
    writeJson(res, 404, { error: 'pending device not found' })
    return
  }
  writeJson(res, 200, success)
}

async function handleDeny(req: IncomingMessage, res: ServerResponse, deps: MobileRouteDeps): Promise<void> {
  if (!isLoopbackRequest(req)) {
    writeJson(res, 403, { error: 'loopback only' })
    return
  }
  if (req.method !== 'POST') {
    writeJson(res, 405, { error: 'method not allowed' })
    return
  }
  let body: unknown
  try {
    body = JSON.parse(await readBody(req))
  } catch {
    writeJson(res, 400, { error: 'invalid json' })
    return
  }
  const deviceId = stringField(body, 'deviceId')
  if (deviceId === undefined) {
    writeJson(res, 400, { error: 'deviceId required' })
    return
  }
  if (!deps.store.denyPending(deviceId)) {
    writeJson(res, 404, { error: 'pending device not found' })
    return
  }
  writeJson(res, 200, { status: 'denied', deviceId })
}

async function handlePairStatus(req: IncomingMessage, res: ServerResponse, deps: MobileRouteDeps): Promise<void> {
  if (!isTrustedApiRequest(req, deps.trustedHosts)) {
    writeJson(res, 403, { error: 'forbidden' })
    return
  }
  if (req.method !== 'GET') {
    writeJson(res, 405, { error: 'method not allowed' })
    return
  }
  const deviceId = queryField(req, 'deviceId')
  if (deviceId === undefined) {
    writeJson(res, 400, { error: 'deviceId required' })
    return
  }
  writeJson(res, 200, deps.store.pollDeviceStatus(deviceId))
}

async function handlePairPending(req: IncomingMessage, res: ServerResponse, deps: MobileRouteDeps): Promise<void> {
  if (!isLoopbackRequest(req)) {
    writeJson(res, 403, { error: 'loopback only' })
    return
  }
  if (req.method !== 'GET') {
    writeJson(res, 405, { error: 'method not allowed' })
    return
  }
  writeJson(res, 200, { items: deps.store.listPending() })
}

async function handleQrcode(req: IncomingMessage, res: ServerResponse, deps: MobileRouteDeps): Promise<void> {
  if (!isLoopbackRequest(req)) {
    writeJson(res, 403, { error: 'loopback only' })
    return
  }
  if (req.method !== 'GET') {
    writeJson(res, 405, { error: 'method not allowed' })
    return
  }
  const host = resolveReachableHost(deps)
  const offer = deps.store.currentPairing(host, deps.bindPort)
    ?? deps.store.createPairing(host, deps.bindPort)
  const qrDataUrl = await QRCode.toDataURL(offer.qrUrl, { margin: 1, width: 220 })
  writeJson(res, 200, { ...offer, qrDataUrl })
}

async function handlePairPolicy(req: IncomingMessage, res: ServerResponse, deps: MobileRouteDeps): Promise<void> {
  if (!isTrustedApiRequest(req, deps.trustedHosts)) {
    writeJson(res, 403, { error: 'forbidden' })
    return
  }
  if (req.method !== 'GET') {
    writeJson(res, 405, { error: 'method not allowed' })
    return
  }
  writeJson(res, 200, deps.store.pairPolicy())
}

async function handlePairSettings(req: IncomingMessage, res: ServerResponse, deps: MobileRouteDeps): Promise<void> {
  if (!isLoopbackRequest(req)) {
    writeJson(res, 403, { error: 'loopback only' })
    return
  }
  if (req.method === 'GET') {
    writeJson(res, 200, deps.store.pairPasswordSettings())
    return
  }
  if (req.method !== 'PUT') {
    writeJson(res, 405, { error: 'method not allowed' })
    return
  }
  let body: unknown
  try {
    body = JSON.parse(await readBody(req))
  } catch {
    writeJson(res, 400, { error: 'invalid json' })
    return
  }
  const mode = stringField(body, 'mode')
  if (mode !== 'none' && mode !== 'required') {
    writeJson(res, 400, { error: 'mode must be none or required' })
    return
  }
  const password = stringField(body, 'password')
  if (!deps.store.setPairPasswordSettings(mode, password)) {
    writeJson(res, 400, { error: 'password required when mode is required' })
    return
  }
  writeJson(res, 200, deps.store.pairPasswordSettings())
}

async function handleDevices(req: IncomingMessage, res: ServerResponse, deps: MobileRouteDeps): Promise<void> {
  if (!isLoopbackRequest(req)) {
    writeJson(res, 403, { error: 'loopback only' })
    return
  }
  if (req.method !== 'GET') {
    writeJson(res, 405, { error: 'method not allowed' })
    return
  }
  writeJson(res, 200, { items: deps.store.listDevices() })
}

async function handleDeviceById(req: IncomingMessage, res: ServerResponse, deps: MobileRouteDeps): Promise<void> {
  if (!isLoopbackRequest(req)) {
    writeJson(res, 403, { error: 'loopback only' })
    return
  }
  if (req.method !== 'DELETE') {
    writeJson(res, 405, { error: 'method not allowed' })
    return
  }
  const pathname = requestPath(req)
  const prefix = '/api/mobile/devices/'
  if (!pathname.startsWith(prefix)) {
    writeJson(res, 404, { error: 'not found' })
    return
  }
  const deviceId = decodeURIComponent(pathname.slice(prefix.length))
  if (deviceId === '') {
    writeJson(res, 400, { error: 'deviceId required' })
    return
  }
  if (!deps.store.revokeDevice(deviceId)) {
    writeJson(res, 404, { error: 'device not found' })
    return
  }
  writeJson(res, 200, { revoked: true, deviceId })
}

function writePairAttempt(
  res: ServerResponse,
  outcome: PairAttemptResult,
): void {
  switch (outcome.kind) {
    case 'not-found':
      writeJson(res, 404, { error: 'pair token not found' })
      return
    case 'consumed':
      writeJson(res, 404, { error: 'pair token already used' })
      return
    case 'expired':
      writeJson(res, 410, { error: 'pair token expired' })
      return
    case 'password-required':
      writeJson(res, 401, { error: 'pair password required' })
      return
    case 'password-invalid':
      writeJson(res, 401, { error: 'invalid pair password' })
      return
    case 'pending':
      writeJson(res, 409, { error: 'pending desktop confirmation', deviceId: outcome.deviceId })
      return
    case 'success':
      writeJson(res, 200, outcome.value)
      return
  }
}

function resolveReachableHost(deps: MobileRouteDeps): string {
  if (deps.bindHost !== '0.0.0.0' && deps.bindHost !== '127.0.0.1') return deps.bindHost
  const lan = deps.trustedHosts.find(entry => !entry.startsWith('127.'))
  if (lan !== undefined) return lan.split(':')[0] ?? lan
  return '127.0.0.1'
}

function isLoopbackRequest(req: IncomingMessage): boolean {
  const host = req.headers.host
  if (host === undefined) return false
  const hostname = host.split(':')[0] ?? host
  return isLoopbackHostname(hostname)
}

function requestPath(req: IncomingMessage): string {
  const raw = req.url ?? '/'
  try {
    return new URL(raw, 'http://127.0.0.1').pathname
  } catch {
    return raw.split('?')[0] ?? raw
  }
}

function queryField(req: IncomingMessage, key: string): string | undefined {
  const raw = req.url ?? '/'
  try {
    const value = new URL(raw, 'http://127.0.0.1').searchParams.get(key)
    return value === null || value === '' ? undefined : value
  } catch {
    return undefined
  }
}

function stringField(body: unknown, key: string): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined
  const value = (body as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : undefined
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}
