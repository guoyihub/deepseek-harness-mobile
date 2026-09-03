/**
 * Mobile turn-tail footer: compact metrics so usage, duration, and clock fit one row.
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

describe('mobile turn tail footer', () => {
  it('uses compact spacing and keeps metric labels visible', () => {
    const actions = declarations(shellCss, '.chatPage [data-turn-tail] [data-message-actions]')
    expect(actions?.get('gap')).toBe('4px')
    expect(actions?.get('flex-wrap')).toBe('nowrap')

    const usageLabel = declarations(
      shellCss,
      ".chatPage [data-turn-tail] [data-message-actions] button[aria-haspopup='dialog'] > span",
    )
    expect(usageLabel?.get('overflow')).toBe('visible')
    expect(usageLabel?.get('text-overflow')).toBe('clip')

    const usageButton = declarations(
      shellCss,
      ".chatPage [data-turn-tail] [data-message-actions] button[aria-haspopup='dialog']",
    )
    expect(usageButton?.get('max-width')).toBe('none')
    expect(usageButton?.get('font-size')).toBe('11px')

    const clock = declarations(
      shellCss,
      '.chatPage [data-turn-tail] [data-message-actions] [data-message-clock]',
    )
    expect(clock?.get('flex')).toBe('none')
    expect(clock?.get('overflow')).toBe('visible')
    expect(clock?.get('font-size')).toBe('11px')
  })

  it('pulls turn-tail metrics closer to the closing assistant reply', () => {
    expect(
      declarations(
        shellCss,
        ".chatPage [data-chat-flow-kind='assistant-step'] + [data-chat-flow-kind='turn-tail']",
      )?.get('margin-top'),
    ).toBe('-10px')
  })
})
