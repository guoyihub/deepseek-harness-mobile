#!/usr/bin/env node
/**
 * DSH Mobile deploy helper — start/stop Host (web) and Mobile PWA in the background.
 * Only runs: pnpm dsh web | pnpm dev:mobile from the repo root.
 */
import { spawn, execSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  openSync,
  closeSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');
const RUN_DIR = join(__dirname, '.run');
const LOG_DIR = join(__dirname, 'logs');

const SERVICES = {
  web: {
    label: 'web',
    url: 'http://127.0.0.1:3080',
    pidFile: join(RUN_DIR, 'web.pid'),
    logFile: join(LOG_DIR, 'web.log'),
    args: ['dsh', 'web'],
  },
  mobile: {
    label: 'mobile',
    url: 'http://127.0.0.1:8030',
    pidFile: join(RUN_DIR, 'mobile.pid'),
    logFile: join(LOG_DIR, 'mobile.log'),
    args: ['dev:mobile'],
  },
};

function ensureDirs() {
  mkdirSync(RUN_DIR, { recursive: true });
  mkdirSync(LOG_DIR, { recursive: true });
}

function readPid(pidFile) {
  if (!existsSync(pidFile)) return null;
  const pid = Number.parseInt(readFileSync(pidFile, 'utf8').trim(), 10);
  return Number.isFinite(pid) && pid > 0 ? pid : null;
}

function isRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function parseTargets(raw = 'all') {
  const normalized = raw.replaceAll(',', ' ').trim().toLowerCase();
  if (!normalized || normalized === 'all' || normalized === 'both') {
    return ['web', 'mobile'];
  }
  if (normalized === 'web' || normalized === 'mobile') {
    return [normalized];
  }
  throw new Error(`unknown target '${raw}' (use web, mobile, or all)`);
}

function requirePnpm() {
  try {
    execSync('pnpm --version', { stdio: 'ignore', windowsHide: true });
  } catch {
    console.error("error: pnpm not found. Install Node.js and run 'pnpm install' in the repo root.");
    process.exit(1);
  }
}

function truncateLog(logFile) {
  const fd = openSync(logFile, 'w');
  closeSync(fd);
}

function startService(name) {
  const svc = SERVICES[name];
  const existing = readPid(svc.pidFile);
  if (isRunning(existing)) {
    console.log(`${svc.label} already running (pid ${existing}) — ${svc.url}`);
    return;
  }
  if (existsSync(svc.pidFile)) unlinkSync(svc.pidFile);

  requirePnpm();
  truncateLog(svc.logFile);

  const logFd = openSync(svc.logFile, 'a');
  const child = spawn('pnpm', svc.args, {
    cwd: ROOT_DIR,
    detached: true,
    stdio: ['ignore', logFd, logFd],
    windowsHide: true,
    shell: process.platform === 'win32',
  });
  closeSync(logFd);

  child.unref();
  writeFileSync(svc.pidFile, String(child.pid), 'utf8');
  console.log(`${svc.label} started (pid ${child.pid}) — ${svc.url}`);
}

async function stopService(name) {
  const svc = SERVICES[name];
  const pid = readPid(svc.pidFile);
  if (!isRunning(pid)) {
    if (existsSync(svc.pidFile)) unlinkSync(svc.pidFile);
    console.log(`${svc.label} is not running`);
    return;
  }

  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore', windowsHide: true });
    } else {
      process.kill(pid, 'SIGTERM');
      for (let i = 0; i < 20; i++) {
        if (!isRunning(pid)) break;
        await delay(250);
      }
      if (isRunning(pid)) process.kill(pid, 'SIGKILL');
    }
  } catch {
    // Process may already have exited.
  }

  if (existsSync(svc.pidFile)) unlinkSync(svc.pidFile);
  console.log(`${svc.label} stopped`);
}

function showStatus() {
  for (const name of ['web', 'mobile']) {
    const svc = SERVICES[name];
    const pid = readPid(svc.pidFile);
    if (isRunning(pid)) {
      console.log(`${svc.label.padEnd(6)} running (pid ${pid}) — ${svc.url}`);
    } else {
      if (existsSync(svc.pidFile)) unlinkSync(svc.pidFile);
      console.log(`${svc.label.padEnd(6)} stopped`);
    }
  }
  console.log(`logs:   ${LOG_DIR}`);
}

function tailLogs(target) {
  const names = target === 'all' || target === 'both' || !target ? ['web', 'mobile'] : parseTargets(target);
  for (const name of names) {
    const logFile = SERVICES[name].logFile;
    if (!existsSync(logFile)) truncateLog(logFile);
  }

  if (process.platform === 'win32') {
    const files = names.map((n) => SERVICES[n].logFile).join(',');
    execSync(
      `powershell -NoProfile -Command "Get-Content -LiteralPath @('${files.replaceAll('\\', '\\\\').replaceAll("'", "''")}') -Wait -Tail 40"`,
      { stdio: 'inherit' },
    );
    return;
  }

  const files = names.map((n) => SERVICES[n].logFile);
  const child = spawn('tail', ['-n', '40', '-f', ...files], { stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code ?? 0));
}

function usage() {
  console.log(`Usage: dsh <command> [target]

Commands:
  start [web|mobile]   Start service(s); omit target to start both
  stop  [web|mobile]   Stop service(s); omit target to stop both
  restart [web|mobile] Restart service(s); omit target to restart both
  logs  [web|mobile]   Tail logs; omit target to follow both
  status               Show running state and URLs

Targets: web, mobile, all (default when omitted)

Examples:
  deploy/dsh.bat start
  deploy/dsh.sh start web
  deploy/dsh.bat stop mobile
  deploy/dsh.bat logs`);
}

async function main() {
  ensureDirs();
  const [cmd, target = 'all'] = process.argv.slice(2);

  try {
    switch (cmd) {
      case 'start':
        for (const name of parseTargets(target)) startService(name);
        break;
      case 'stop':
        for (const name of parseTargets(target)) await stopService(name);
        break;
      case 'restart':
        for (const name of parseTargets(target)) await stopService(name);
        await delay(1000);
        for (const name of parseTargets(target)) startService(name);
        break;
      case 'logs':
        tailLogs(target);
        break;
      case 'status':
        showStatus();
        break;
      case undefined:
      case '':
      case 'help':
      case '-h':
      case '--help':
        usage();
        break;
      default:
        console.error(`error: unknown command '${cmd}'`);
        usage();
        process.exit(1);
    }
  } catch (err) {
    console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
