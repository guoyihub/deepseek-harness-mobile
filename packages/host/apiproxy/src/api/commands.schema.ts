/**
 * commands domain zod schemas (names derived from map keys: commandListRequestSchema /
 * commandListValueSchema).
 */

import { z } from 'zod'
import type { RequestPayload, ResponseValue } from './rpc-map.ts'
import type { Wire } from './rpc.schema.ts'
import { sessionIdSchema } from './sessions.schema.ts'
import type { CommandEntry } from './commands.ts'

/** CommandEntry row of command.list. */
export const commandEntrySchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  input: z.object({ hint: z.string() }).optional(),
}) satisfies z.ZodType<Wire<CommandEntry>>

/** command.list request payload. */
export const commandListRequestSchema = z.object({
  sessionId: sessionIdSchema,
}) satisfies z.ZodType<Wire<RequestPayload<'command.list'>>>

/** command.list response value. */
export const commandListValueSchema = z.object({
  commands: z.array(commandEntrySchema),
}) satisfies z.ZodType<Wire<ResponseValue<'command.list'>>>

/** command.execute request payload (the full slash line, leading `/` included). */
export const commandExecuteRequestSchema = z.object({
  sessionId: sessionIdSchema,
  line: z.string().min(1),
}) satisfies z.ZodType<Wire<RequestPayload<'command.execute'>>>

/** command.execute response value (admission; unmatched lines are not errors). */
export const commandExecuteValueSchema = z.union([
  z.object({ matched: z.literal(false) }),
  z.object({
    matched: z.literal(true),
    commandId: z.string().min(1),
    result: z.union([
      z.object({ kind: z.literal('success'), text: z.string().optional() }),
      z.object({ kind: z.literal('error'), text: z.string() }),
    ]),
  }),
]) satisfies z.ZodType<Wire<ResponseValue<'command.execute'>>>
