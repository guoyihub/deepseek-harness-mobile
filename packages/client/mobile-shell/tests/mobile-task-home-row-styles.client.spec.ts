/**
 * Mobile task home list spacing: session rows reuse desktop Rows.module.css.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const shellCss = readFileSync(
  fileURLToPath(new URL('../src/client/mobile-shell.module.css', import.meta.url)),
  'utf8',
)
const rowsCss = readFileSync(
  fileURLToPath(new URL('../../ui-workspace/src/client/rows/Rows.module.css', import.meta.url)),
  'utf8',
)

/**
 * Declarations of one selector rule, keyed by property with whitespace collapsed.
 * @param source - CSS text to scan.
 * @param selector - one exact selector, including a leading dot for local classes.
 * @returns the rule's declarations, or undefined when no such rule exists.
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

describe('mobile task home session list', () => {
  it('uses touch-sized session rows and grouped list rhythm', () => {
    expect(declarations(shellCss, '.taskHomeList')?.get('padding')).toBe('0 0 0 20px')
    expect(declarations(shellCss, '.taskHomeList > li + li')?.get('margin-top')).toBe('4px')
    expect(declarations(rowsCss, '.sessionRow')?.get('height')).toBe('32px')
    expect(declarations(rowsCss, '.sessionRowMobile')?.get('height')).toBe('48px')
    expect(declarations(rowsCss, '.sessionRowMobile .title')?.get('font-size')).toBe('17px')
    expect(declarations(rowsCss, '.sessionRowMobile .time')?.get('font-size')).toBe('14px')
    expect(declarations(rowsCss, '.sessionRowMobile .rowActions')?.get('display')).toBe('inline-flex')
    expect(declarations(rowsCss, '.searchResultRowMobile')?.get('min-height')).toBe('64px')
  })
})
