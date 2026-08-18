/**
 * Host-side slash-command dispatch in sessions.prompt: a leading-/
 * single-text-block prompt executes through the command registry and never
 * reaches the model. Successful commands return ok with the command slot;
 * usage errors and unknown names return RPC errors. Non-command prompts
 * still route to agent.followup.
 */

import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import type { Agent } from '@deepseek-ai/dsh-agent'
import CommandRuntime from '@deepseek-ai/dsh-commands'
import SessionStore from '@deepseek-ai/dsh-session'
import UserQuestionService from '@deepseek-ai/dsh-user-questions'
import type { RpcRequest } from '@deepseek-ai/dsh-host-apiproxy/api/rpc'
import { RpcId } from '@deepseek-ai/dsh-host-apiproxy/api/rpc'
import { createApiProxy } from '../src/api-proxy.ts'

interface Harness {
  readonly ctx: Context
  readonly agent: Agent
  readonly followup: ReturnType<typeof vi.fn>
}

async function harness(): Promise<Harness> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(UserQuestionService)
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(CommandRuntime)
  const session = ctx.sessions.create()
  const followup = vi.fn()
  const agent = {
    id: session.id,
    session,
    status: 'idle',
    ctx,
    followup,
    inbox: { nextTurn: [], nextStep: [] },
  } as unknown as Agent
  ctx.agents.register(agent)
  ctx.commands.register({
    name: 'echo',
    description: 'Echo a line',
    handler: invocation => ({ kind: 'success', text: `echoed:${invocation.rawInput.trim()}` }),
  })
  ctx.commands.register({
    name: 'fail',
    description: 'Report a usage error',
    handler: () => ({ kind: 'error', text: 'fail usage' }),
  })
  return { ctx, agent, followup }
}

let nextRpc = 1
function request<P>(payload: P): RpcRequest<P> {
  return { rpcId: RpcId(`command-${String(nextRpc++)}`), payload }
}

describe('sessions.prompt slash-command dispatch', () => {
  it('executes a matched line: command slot carried, no model turn, lifecycle logged', async () => {
    const test = await harness()
    const api = createApiProxy(test.ctx, {
      defaultModelSelection: () => ({ provider: 'p', model: 'm' }),
      cwd: '/tmp',
    })

    const response = await api.sessions.prompt(request({
      sessionId: test.agent.id,
      mode: 'queue' as const,
      content: [{ type: 'text' as const, text: '/echo hello' }],
    }))
    expect(response.result.ok).toBe(true)
    if (!response.result.ok) throw new Error('unreachable')
    expect(response.result.value.accepted).toBe(true)
    expect(response.result.value.command).toEqual({ kind: 'success', text: 'echoed:hello' })
    expect(test.followup).not.toHaveBeenCalled()
    expect(test.agent.session.events.filter(event => event.type === 'user/message')).toEqual([])
    expect(test.agent.session.events.map(event => event.type)).toEqual(['command/run', 'command/done'])
  })

  it('dispatches commands regardless of mode and never steers', async () => {
    const test = await harness()
    const api = createApiProxy(test.ctx, {
      defaultModelSelection: () => ({ provider: 'p', model: 'm' }),
      cwd: '/tmp',
    })

    const response = await api.sessions.prompt(request({
      sessionId: test.agent.id,
      mode: 'steer' as const,
      content: [{ type: 'text' as const, text: '/echo' }],
    }))
    expect(response.result.ok).toBe(true)
    if (!response.result.ok) throw new Error('unreachable')
    expect(response.result.value.command?.text).toBe('echoed:')
    expect(test.followup).not.toHaveBeenCalled()
  })

  it('returns unknown-command for an unmatched slash token', async () => {
    const test = await harness()
    const api = createApiProxy(test.ctx, {
      defaultModelSelection: () => ({ provider: 'p', model: 'm' }),
      cwd: '/tmp',
    })

    const response = await api.sessions.prompt(request({
      sessionId: test.agent.id,
      mode: 'queue' as const,
      content: [{ type: 'text' as const, text: '/missing now' }],
    }))
    expect(response.result).toMatchObject({
      ok: false,
      error: { code: 'unknown-command', message: 'unknown command: /missing' },
    })
    expect(test.followup).not.toHaveBeenCalled()
  })

  it('returns command-error for a handler usage failure', async () => {
    const test = await harness()
    const api = createApiProxy(test.ctx, {
      defaultModelSelection: () => ({ provider: 'p', model: 'm' }),
      cwd: '/tmp',
    })

    const response = await api.sessions.prompt(request({
      sessionId: test.agent.id,
      mode: 'queue' as const,
      content: [{ type: 'text' as const, text: '/fail' }],
    }))
    expect(response.result).toMatchObject({
      ok: false,
      error: { code: 'command-error', message: 'fail usage' },
    })
    expect(test.followup).not.toHaveBeenCalled()
  })

  it('still sends an ordinary prompt to the agent', async () => {
    const test = await harness()
    const api = createApiProxy(test.ctx, {
      defaultModelSelection: () => ({ provider: 'p', model: 'm' }),
      cwd: '/tmp',
    })

    const response = await api.sessions.prompt(request({
      sessionId: test.agent.id,
      mode: 'queue' as const,
      content: [{ type: 'text' as const, text: 'hello' }],
    }))
    expect(response.result.ok).toBe(true)
    expect(test.followup).toHaveBeenCalledOnce()
  })
})

describe('command.execute', () => {
  it('admits a matched line without a model turn', async () => {
    const test = await harness()
    const api = createApiProxy(test.ctx, {
      defaultModelSelection: () => ({ provider: 'p', model: 'm' }),
      cwd: '/tmp',
    })

    const response = await api.commands.execute(
      request({ sessionId: test.agent.id, line: '/echo hello' }),
      new AbortController().signal,
    )
    expect(response.result.ok).toBe(true)
    if (!response.result.ok) throw new Error('unreachable')
    expect(response.result.value).toMatchObject({
      matched: true,
      result: { kind: 'success', text: 'echoed:hello' },
    })
    expect(test.followup).not.toHaveBeenCalled()
    expect(test.agent.session.events.map(event => event.type)).toEqual(['command/run', 'command/done'])
  })

  it('returns matched:false for an unknown line without lifecycle events', async () => {
    const test = await harness()
    const api = createApiProxy(test.ctx, {
      defaultModelSelection: () => ({ provider: 'p', model: 'm' }),
      cwd: '/tmp',
    })

    const response = await api.commands.execute(
      request({ sessionId: test.agent.id, line: '/missing' }),
      new AbortController().signal,
    )
    expect(response.result).toEqual({
      ok: true,
      value: { matched: false },
    })
    expect(test.agent.session.events).toEqual([])
  })
})
