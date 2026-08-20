/** One-shot builds for the mobile repository: lib prerequisites plus web and/or mobile apps. */

import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

type BuildTarget = 'all' | 'web' | 'mobile'

const ROOT = resolve(import.meta.dirname, '..')

/** Run one pnpm invocation from the repository root. */
function runPnpm(args: readonly string[]): void {
  const execPath = process.env.npm_execpath
  if (execPath === undefined || execPath === '') {
    throw new Error('build: npm_execpath is unavailable; invoke builds through pnpm')
  }
  const result = spawnSync(process.execPath, [execPath, ...args], {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
  })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) {
    throw new Error(`build: pnpm ${args.join(' ')} exited with ${String(result.status ?? result.signal)}`)
  }
}

/** Compile Host/Client libraries once before app bundles. */
function buildLib(): void {
  runPnpm(['run', 'build:lib'])
}

/** Build the desktop Web frontend dist. */
function buildWebApp(): void {
  runPnpm(['--filter', '@deepseek-ai/dsh-web-frontend', 'run', 'build'])
}

/** Build the Mobile PWA production bundle. */
function buildMobileApp(): void {
  runPnpm(['--filter', '@deepseek-ai/deepseek-harness-mobile', 'run', 'build'])
}

/** Resolve the build target from argv. */
function parseTarget(argv: readonly string[]): BuildTarget {
  const token = argv[0]?.trim().toLowerCase()
  if (token === undefined || token === '' || token === 'all') return 'all'
  if (token === 'web' || token === 'mobile') return token
  throw new Error(`build: unknown target ${JSON.stringify(token)} (use web, mobile, or all)`)
}

/** Run the selected build target. */
function main(): void {
  const target = parseTarget(process.argv.slice(2))
  buildLib()
  if (target === 'web' || target === 'all') buildWebApp()
  if (target === 'mobile' || target === 'all') buildMobileApp()
}

if (import.meta.main) {
  try {
    main()
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
