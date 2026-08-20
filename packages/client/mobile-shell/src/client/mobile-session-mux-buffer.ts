/**
 * Route answerable mux frames to a registered mobile {@link Session}, or
 * buffer them until one opens — mirrors desktop SessionManager buffering.
 */
import type { MuxFrame, RpcRequest, SessionId } from '@deepseek-ai/dsh-client-connection/client'
import type { Session } from '@deepseek-ai/dsh-client-runtime/src/client/sessions/session.ts'

const buffers = new Map<SessionId, RpcRequest<MuxFrame>[]>()
const registered = new Map<SessionId, Session>()

function bufferedRequestKey(envelope: RpcRequest<MuxFrame>): string | null {
  const frame = envelope.payload
  switch (frame.type) {
    case 'approval/requested':
      return `a:${frame.approvalId}`
    case 'question/requested':
      return `q:${envelope.rpcId}`
    case 'session/queue':
      return 'queue'
    default:
      return null
  }
}

function resolutionKey(frame: MuxFrame): string | null {
  switch (frame.type) {
    case 'approval/resolved':
      return `a:${frame.approvalId}`
    case 'question/resolved':
      return `q:${frame.questionRpcId}`
    default:
      return null
  }
}

/** Whether the mobile session router owns this mux frame. */
export function isMobileSessionRoutedFrame(frame: MuxFrame): boolean {
  switch (frame.type) {
    case 'approval/requested':
    case 'approval/resolved':
    case 'question/requested':
    case 'question/resolved':
    case 'session/queue':
      return true
    default:
      return false
  }
}

/**
 * Retain one answerable mux envelope until its session instance can consume it.
 * @param sessionId - target session.
 * @param envelope - mux rpc envelope.
 */
export function bufferMobileMuxEnvelope(
  sessionId: SessionId,
  envelope: RpcRequest<MuxFrame>,
): void {
  const frame = envelope.payload
  if (frame.type === 'approval/resolved' || frame.type === 'question/resolved') {
    const key = resolutionKey(frame)
    if (key === null) return
    const buffer = buffers.get(sessionId)
    if (buffer === undefined) return
    const prior = buffer.findIndex(item => bufferedRequestKey(item) === key)
    if (prior !== -1) buffer.splice(prior, 1)
    if (buffer.length === 0) buffers.delete(sessionId)
    return
  }
  const key = bufferedRequestKey(envelope)
  if (key === null) return
  const buffer = buffers.get(sessionId) ?? []
  const prior = buffer.findIndex(item => bufferedRequestKey(item) === key)
  if (prior === -1) buffer.push(envelope)
  else buffer[prior] = envelope
  buffers.set(sessionId, buffer)
}

/**
 * Replay buffered answerable frames into an opened session, then drop the buffer.
 * @param sessionId - target session.
 * @param session - opened session instance.
 */
export function drainMobileMuxBuffer(sessionId: SessionId, session: Session): void {
  const buffered = buffers.get(sessionId)
  if (buffered === undefined) return
  buffers.delete(sessionId)
  for (const envelope of buffered) {
    session.handleMuxEnvelope(envelope.rpcId, envelope.payload)
  }
}

/**
 * Register an opened session so live answerable frames route directly to it.
 * @param sessionId - active session id.
 * @param session - opened session instance.
 */
export function registerMobileSession(sessionId: SessionId, session: Session): void {
  registered.set(sessionId, session)
  drainMobileMuxBuffer(sessionId, session)
}

/** Stop routing live answerable frames to one session instance. */
export function unregisterMobileSession(sessionId: SessionId): void {
  registered.delete(sessionId)
}

/**
 * Deliver one answerable mux frame to a registered session or the buffer.
 * @param sessionId - target session id.
 * @param envelope - mux rpc envelope.
 */
export function routeMobileMuxEnvelope(
  sessionId: SessionId,
  envelope: RpcRequest<MuxFrame>,
): void {
  const session = registered.get(sessionId)
  if (session !== undefined) {
    session.handleMuxEnvelope(envelope.rpcId, envelope.payload)
    return
  }
  bufferMobileMuxEnvelope(sessionId, envelope)
}

/**
 * Drop any retained frames for a session the UI no longer owns.
 * @param sessionId - abandoned session id.
 */
export function clearMobileMuxBuffer(sessionId: SessionId): void {
  buffers.delete(sessionId)
  registered.delete(sessionId)
}
