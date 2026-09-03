/**
 * Mobile turn-process collapse must leave the flex message list.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const shellCss = readFileSync(
  fileURLToPath(new URL('../src/client/mobile-shell.module.css', import.meta.url)),
  'utf8',
)

/**
 * Declarations of one selector rule, keyed by property with whitespace collapsed.
 * @param source - CSS text to scan.
 * @param selector - one exact selector (comma-list members compared after trim).
 */
function declarations(source: string, selector: string): Map<string, string> | undefined {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, ' ')
  const found = new Map<string, string>()
  for (const [, selectorList = '', body = ''] of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!selectorList.split(',').map(value => value.trim()).includes(selector)) continue
    for (const part of body.split(';')) {
      const colon = part.indexOf(':')
      if (colon === -1) continue
      found.set(part.slice(0, colon).trim(), part.slice(colon + 1).trim().replace(/\s+/g, ' '))
    }
  }
  return found.size === 0 ? undefined : found
}

describe('mobile turn process collapse layout', () => {
  it('removes hidden process rows from the message-list flex flow', () => {
    for (const selector of [
      '.chatPage [data-chat-flow-key][hidden]',
      '.chatPage [data-turn-process-hidden]',
      '.chatPage [data-turn-process-inline][hidden]',
    ]) {
      expect(declarations(shellCss, selector)?.get('display')).toBe('none !important')
    }
  })
})
