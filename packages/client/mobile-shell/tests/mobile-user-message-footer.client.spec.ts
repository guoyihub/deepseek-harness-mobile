/**
 * Mobile user-bubble footer: clock sits tight against the copy button.
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
 * @param selector - one exact selector, including a leading dot for local classes.
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

describe('mobile user message footer', () => {
  it('keeps the clock adjacent to copy on the right', () => {
    expect(declarations(
      shellCss,
      ".chatPage [data-chat-flow-kind='user'] [data-message-actions]",
    )?.get('gap')).toBe('4px')
    expect(declarations(
      shellCss,
      ".chatPage [data-chat-flow-kind='user'] [data-message-actions]",
    )?.get('width')).toBe('auto')
    expect(declarations(
      shellCss,
      ".chatPage [data-chat-flow-kind='user'] [data-message-actions] [data-message-clock]",
    )?.get('flex')).toBe('none')
    expect(declarations(
      shellCss,
      ".chatPage [data-chat-flow-kind='user'] [data-message-actions] [data-message-clock]",
    )?.get('padding-right')).toBe('0')
  })
})
