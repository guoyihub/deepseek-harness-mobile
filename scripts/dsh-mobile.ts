/**
 * Mobile repository launcher for `pnpm dsh`.
 *
 * - `pnpm dsh` — start Host (web profile) and Mobile PWA dev servers together
 * - `pnpm dsh web` — boot the web Host (forwards to the upstream CLI)
 * - `pnpm dsh mobile` — start the Mobile PWA dev server
 * - any other argv — forwarded to the upstream `dsh` CLI unchanged
 */

import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const BIN = resolve(ROOT, 'apps/cli/src/bin.ts')

/** Run the upstream dsh CLI and mirror its exit code. */
function runDshCli(argv: readonly string[]): never {
  const result = spawnSync(process.execPath, ['--import', 'tsx/esm', BIN, ...argv], {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
  })
  if (result.error !== undefined) throw result.error
  process.exit(result.status ?? 1)
}

/** Start the Mobile PWA Vite dev server. */
function runMobileDev(): never {
  const execPath = process.env.npm_execpath
  if (execPath === undefined || execPath === '') {
    throw new Error('dsh mobile: npm_execpath is unavailable; invoke through pnpm')
  }
  const result = spawnSync(process.execPath, [execPath, 'run', 'dev:mobile'], {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
  })
  if (result.error !== undefined) throw result.error
  process.exit(result.status ?? 1)
}

/** Start web Host and Mobile dev servers in one terminal; stop both on exit. */
function runBoth(): void {
  const execPath = process.env.npm_execpath
  if (execPath === undefined || execPath === '') {
    throw new Error('dsh: npm_execpath is unavailable; invoke through pnpm')
  }

  const children: ChildProcess[] = []
  let stopping = false

  const stopAll = (signal: NodeJS.Signals = 'SIGTERM'): void => {
    if (stopping) return
    stopping = true
    for (const child of children) {
      if (child.pid !== undefined && !child.killed) {
        try {
          if (process.platform === 'win32') {
            spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
          } else {
            child.kill(signal)
          }
        } catch {
          // Child may already have exited.
        }
      }
    }
  }

  const spawnTracked = (label: string, command: string, args: readonly string[]): void => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: process.env,
      stdio: 'inherit',
    })
    children.push(child)
    child.on('exit', (code, signal) => {
      if (stopping) return
      stopping = true
      if (signal !== null) {
        stopAll('SIGTERM')
        process.exit(1)
      }
      stopAll('SIGTERM')
      process.exit(code ?? 1)
    })
    child.on('error', (error) => {
      console.error(`dsh: ${label} failed to start: ${error.message}`)
      stopAll('SIGTERM')
      process.exit(1)
    })
  }

  process.on('SIGINT', () => {
    stopAll('SIGINT')
    process.exit(130)
  })
  process.on('SIGTERM', () => {
    stopAll('SIGTERM')
    process.exit(143)
  })

  console.log('dsh: starting web Host (:3080) and Mobile PWA (:8030); Ctrl+C stops both')
  spawnTracked('web', process.execPath, ['--import', 'tsx/esm', BIN, 'web'])
  spawnTracked('mobile', process.execPath, [execPath, 'run', 'dev:mobile'])
}

const argv = process.argv.slice(2)
const [first, ...rest] = argv

if (first === undefined) {
  runBoth()
} else if (first === 'web') {
  runDshCli(['web', ...rest])
} else if (first === 'mobile') {
  if (rest.length > 0) {
    console.error('dsh mobile: extra arguments are not supported; Mobile dev reads Vite config only')
    process.exit(1)
  }
  runMobileDev()
} else {
  runDshCli(argv)
}
