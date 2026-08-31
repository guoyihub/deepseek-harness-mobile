/**
 * Handle Host Remote Event waterfall deliveries for the mobile PWA.
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ToolCallId } from '@deepseek-ai/dsh-llm'
import type { AskUserQuestionItem } from '@deepseek-ai/dsh-user-questions'
import { PendingApproval } from '@deepseek-ai/dsh-client-ui-approval/src/client/contract/slots.ts'
import { PendingQuestion } from '@deepseek-ai/dsh-client-ui-user-questions/src/client/contract/slots.ts'
import {
  projectRemoteEventRejection,
  type RemoteEventClientId,
  type RemoteEventId,
  type RemoteEventInvocationFrame,
  type RemoteEventResult,
} from '@deepseek-ai/dsh-api-gateway/src/stream-protocol.ts'
import { mobileConnectionRpc } from './mobile-api-client.ts'
import { publishMobilePendingInteraction } from './mobile-pending-registry.ts'

interface ActiveWaterfall {
  readonly abort: AbortController
  readonly task: Promise<void>
}

const active = new Map<string, ActiveWaterfall>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseInvocationFrame(value: unknown): RemoteEventInvocationFrame | undefined {
  if (!isRecord(value) || value.type !== 'waterfall') return undefined
  if (typeof value.event !== 'string' || typeof value.eventId !== 'string') return undefined
  if (typeof value.agentId !== 'string' || !isRecord(value.request)) return undefined
  return {
    type: 'waterfall',
    event: value.event,
    eventId: value.eventId as RemoteEventId,
    agentId: value.agentId as RemoteEventInvocationFrame['agentId'],
    request: value.request,
  }
}

function parseCancelFrame(value: unknown): RemoteEventId | undefined {
  if (!isRecord(value) || value.type !== 'cancel') return undefined
  if (typeof value.eventId !== 'string') return undefined
  return value.eventId as RemoteEventId
}

async function submitRemoteEventResult(
  result: RemoteEventResult,
  signal: AbortSignal,
): Promise<void> {
  const response = await mobileConnectionRpc().call(
    '/api',
    '$events/result',
    { args: result },
    signal,
  )
  if (!response.ok) throw new Error(response.error.message)
}

function settleApproval(
  frame: RemoteEventInvocationFrame,
  clientId: RemoteEventClientId,
  deliverySignal: AbortSignal,
): void {
  const sessionId = frame.agentId as SessionId
  const request = frame.request
  const toolName = request.toolName
  if (typeof toolName !== 'string') return
  const pending = new PendingApproval(sessionId, {
    toolName,
    ...(typeof request.callId === 'string' ? { callId: request.callId as ToolCallId } : {}),
    ...(typeof request.reason === 'string' ? { reason: request.reason } : {}),
    signal: deliverySignal,
  })
  const controller = new AbortController()
  const delivery = AbortSignal.any([deliverySignal, controller.signal])
  const remove = publishMobilePendingInteraction(pending, frame.eventId, () => {
    pending.abort(new Error('mobile remote events: generation ended'))
  })
  const task = (async () => {
    try {
      const value = await pending.result
      if (delivery.aborted) return
      await submitRemoteEventResult({
        clientId,
        eventId: frame.eventId,
        outcome: { kind: 'result', value },
      }, delivery)
    } catch (error) {
      if (delivery.aborted) return
      await submitRemoteEventResult({
        clientId,
        eventId: frame.eventId,
        outcome: { kind: 'rejected', error: projectRemoteEventRejection(error) },
      }, delivery)
    } finally {
      remove()
      controller.abort()
      active.delete(frame.eventId)
    }
  })()
  active.set(frame.eventId, { abort: controller, task })
}

function settleQuestion(
  frame: RemoteEventInvocationFrame,
  clientId: RemoteEventClientId,
  deliverySignal: AbortSignal,
): void {
  const sessionId = frame.agentId as SessionId
  const questions = frame.request.questions
  if (!Array.isArray(questions)) return
  const pending = new PendingQuestion(
    sessionId,
    questions as readonly AskUserQuestionItem[],
    deliverySignal,
  )
  const controller = new AbortController()
  const delivery = AbortSignal.any([deliverySignal, controller.signal])
  const remove = publishMobilePendingInteraction(pending, frame.eventId, () => {
    pending.abort(new Error('mobile remote events: generation ended'))
  })
  const task = (async () => {
    try {
      const value = await pending.result
      if (delivery.aborted) return
      await submitRemoteEventResult({
        clientId,
        eventId: frame.eventId,
        outcome: { kind: 'result', value },
      }, delivery)
    } catch (error) {
      if (delivery.aborted) return
      await submitRemoteEventResult({
        clientId,
        eventId: frame.eventId,
        outcome: { kind: 'rejected', error: projectRemoteEventRejection(error) },
      }, delivery)
    } finally {
      remove()
      controller.abort()
      active.delete(frame.eventId)
    }
  })()
  active.set(frame.eventId, { abort: controller, task })
}

/**
 * Dispatch one forwarded Remote Event frame from the active `$events` generation.
 * @param value - untrusted stream item after the ready frame.
 * @param clientId - active generation identity from the ready frame.
 * @param generationSignal - lifetime of the current connection generation.
 */
export function handleMobileRemoteEventFrame(
  value: unknown,
  clientId: RemoteEventClientId,
  generationSignal: AbortSignal,
): void {
  const cancelId = parseCancelFrame(value)
  if (cancelId !== undefined) {
    active.get(cancelId)?.abort.abort(new Error('mobile remote events: Host cancelled the request'))
    return
  }
  const frame = parseInvocationFrame(value)
  if (frame === undefined) return
  if (frame.event === 'approval/request') {
    settleApproval(frame, clientId, generationSignal)
    return
  }
  if (frame.event === 'user-questions/request') {
    settleQuestion(frame, clientId, generationSignal)
  }
}

/** Abort every in-flight waterfall answer task (connection generation ended). */
export async function drainMobileRemoteEvents(): Promise<void> {
  const tasks = [...active.values()].map(entry => entry.task)
  for (const entry of active.values()) {
    entry.abort.abort(new Error('mobile remote events: generation ended'))
  }
  active.clear()
  await Promise.allSettled(tasks)
}
