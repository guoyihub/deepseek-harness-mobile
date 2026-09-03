/**
 * Mobile header feather: scrollports tuck under chrome; no in-flow sticky overlay.
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

describe('mobile scroll top feather', () => {
  it('does not paint a sticky gradient inside scroll content', () => {
    expect(shellCss.includes('.pullToRefreshScroll::before')).toBe(false)
    expect(shellCss.includes('.messageList::before')).toBe(false)
  })

  it('tucks chat and task-home scrollports under header chrome', () => {
    expect(declarations(shellCss, '.chatSurface .chatContent')?.get('padding-top')).toBe('0')
    expect(declarations(shellCss, '.chatSurface .chatPage .messageList')?.get('padding-top')).toContain(
      'var(--mobile-chat-header-body, 71px)',
    )
    expect(declarations(shellCss, '.chatSurface .chatPage .messageList')?.get('padding-top')).toContain(
      'var(--mobile-chrome-feather, 20px)',
    )
    expect(declarations(shellCss, '.chatSurface .chatKeyboardBody')?.get('margin-top')).toBe(
      'calc(-1 * var(--mobile-chrome-feather, 20px))',
    )
    expect(declarations(shellCss, '.chatSurface .chatKeyboardBody')?.get('padding-top')).toBe(
      'var(--mobile-chrome-feather, 20px)',
    )
    expect(declarations(shellCss, '.taskHomeContentHost')?.get('margin-top')).toBe(
      'calc(-1 * var(--mobile-chrome-feather))',
    )
    expect(declarations(shellCss, '.taskHomeContentHost')?.get('padding-top')).toBe(
      'var(--mobile-chrome-feather)',
    )
  })

  it('paints the chat header feather on the fixed wrapper', () => {
    expect(declarations(shellCss, '.chatSurface')?.get('--mobile-chrome-feather')).toBe('20px')
    const feather = declarations(shellCss, '.chatSurfaceHeader::after')
    expect(feather?.get('position')).toBe('absolute')
    expect(feather?.get('height')).toBe('var(--mobile-chrome-feather, 20px)')
    expect(feather?.get('bottom')).toBe('calc(-1 * var(--mobile-chrome-feather, 20px))')
    expect(feather?.get('background')).toContain('color-mix')
    expect(feather?.get('pointer-events')).toBe('none')
  })

  it('keeps the tab header tight to the preset and workspace row', () => {
    expect(declarations(shellCss, '.shellHeaderChatWithTabsPinned')?.get('padding')).toContain('1px')
    expect(declarations(shellCss, '.chatSurface:has(.shellHeaderChatWithTabsPinned)')?.get('--mobile-chat-header-body')).toBe('71px')
  })

  it('keeps the fixed chat header feather visible outside the surface clip', () => {
    expect(declarations(shellCss, '.chatSurfaceHeader')?.get('overflow')).toBe('visible')
  })

  it('reserves half the prior bottom scroll inset above the composer dock', () => {
    expect(declarations(shellCss, '.chatSurface .chatPage .messageList')?.get('padding-bottom')).toBe(
      'calc(12px + var(--mobile-chrome-feather, 20px) / 2)',
    )
  })
})
