/** Shared Gateway mux, Host generation, and Session remotes for the mobile PWA. */

import {
  ConnectionController,
  type ConnectionGeneration,
  type ConnectionGenerationSource,
  type ConnectionHostInfo,
  type ConnectionState,
} from '@deepseek-ai/dsh-client-connection/client'
import { RemoteStreamMuxClient } from '@deepseek-ai/dsh-api-gateway/client'
import {
  REMOTE_EVENT_STREAM_ENDPOINT,
  REMOTE_EVENT_STREAM_PAYLOAD,
  type RemoteEventClientId,
} from '@deepseek-ai/dsh-api-gateway/src/stream-protocol.ts'
import { createMobileSessionRemotes } from './mobile-session-remotes.ts'
import { mobileConnectionRpc } from './mobile-api-client.ts'
import { clearMobilePendingRegistry } from './mobile-pending-registry.ts'
import {
  drainMobileRemoteEvents,
  handleMobileRemoteEventFrame,
} from './mobile-remote-events.ts'

const streams = new RemoteStreamMuxClient()
let generation: ConnectionGeneration | undefined
const generationListeners = new Set<() => void>()

const generationSourceFace = {
  getSnapshot: () => generation,
  subscribe: (listener: () => void) => {
    generationListeners.add(listener)
    return () => { generationListeners.delete(listener) }
  },
}

function publishGeneration(next: ConnectionGeneration | undefined): void {
  if (Object.is(generation, next)) return
  generation = next
  for (const listener of [...generationListeners]) listener()
}

const runGeneration: ConnectionGenerationSource = async (signal, ready) => {
  streams.start()
  clearMobilePendingRegistry()
  const source = streams.open(REMOTE_EVENT_STREAM_ENDPOINT, REMOTE_EVENT_STREAM_PAYLOAD, signal)
  let clientId: RemoteEventClientId | undefined
  try {
    for await (const value of source) {
      if (clientId === undefined) {
        const host = parseReadyHost(value)
        clientId = parseReadyClientId(value)
        ready(host)
        continue
      }
      handleMobileRemoteEventFrame(value, clientId, signal)
    }
  } finally {
    await drainMobileRemoteEvents()
    clearMobilePendingRegistry()
  }
}

function parseReadyClientId(value: unknown): RemoteEventClientId {
  if (
    typeof value !== 'object'
    || value === null
    || !('clientId' in value)
    || typeof value.clientId !== 'string'
  ) {
    throw new TypeError('mobile connection: forwarded event stream did not begin with ready')
  }
  return value.clientId as RemoteEventClientId
}

function parseReadyHost(value: unknown): ConnectionHostInfo {
  if (
    typeof value !== 'object'
    || value === null
    || !('type' in value)
    || value.type !== 'ready'
    || !('host' in value)
    || typeof value.host !== 'object'
    || value.host === null
    || !('home' in value.host)
    || typeof value.host.home !== 'string'
  ) {
    throw new TypeError('mobile connection: forwarded event stream did not begin with ready')
  }
  return { home: value.host.home }
}

/** Shared Session remotes used by every mobile Session object. */
export const mobileSessionRemotes = createMobileSessionRemotes(
  mobileConnectionRpc(),
  streams,
  generationSourceFace,
)

/** Open workspace follow on the shared mux. */
export function openMobileWorkspaceFollow(signal: AbortSignal): AsyncIterable<unknown> {
  return streams.open('workspace/follow', { args: {} }, signal)
}

export interface MobileConnectionLoopSinks {
  onConnected: (host: ConnectionHostInfo) => void
  onStateChange: (state: ConnectionState) => void
}

/**
 * Start the Connection generation loop over the Gateway event stream.
 * @param sinks - connect and state callbacks.
 */
export function startMobileConnectionLoop(sinks: MobileConnectionLoopSinks): ConnectionController {
  let generationId = 0
  const controller = new ConnectionController(runGeneration, {
    onConnected: (host) => {
      publishGeneration({ id: ++generationId, host })
      sinks.onConnected(host)
    },
    onStateChange: (state) => {
      if (state !== 'connected') publishGeneration(undefined)
      sinks.onStateChange(state)
    },
    onReconnectRequested: () => { streams.reconnect() },
  })
  streams.start()
  controller.start()
  return controller
}
