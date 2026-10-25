#!/usr/bin/env node
/**
 * Shared helpers for .opencode/scripts (Node ESM, builtins only).
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const OWNER_REPO = 'themeganerddddddd/LouisianaFrench';
export const EVIDENCE_ROOT = 'docs/evidence';
export const FORBIDDEN_EVIDENCE = 'docs/pr-evidence';

/**
 * Resolve the git repository root by walking up from `from` (default: cwd).
 */
export function repoRoot(from = process.cwd()) {
  let dir = resolve(from);
  for (;;) {
    if (existsSync(resolve(dir, '.git'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  try {
    return run('git', ['rev-parse', '--show-toplevel'], { cwd: from }).trim();
  } catch {
    throw new Error(`Could not find git repository root from ${from}`);
  }
}

/**
 * Run a command and return stdout as a string.
 * Throws on non-zero exit unless `opts.allowFail` is true.
 */
export function run(cmd, args = [], opts = {}) {
  const { cwd, allowFail = false, allowFailure = false, trim = true, input, env, stdio } = opts;
  const softFail = allowFail || allowFailure;
  try {
    const out = execFileSync(cmd, args, {
      cwd: cwd ?? undefined,
      encoding: 'utf8',
      input,
      env: env ? { ...process.env, ...env } : process.env,
      stdio: stdio ?? ['pipe', 'pipe', 'pipe'],
      maxBuffer: 20 * 1024 * 1024,
    });
    return trim ? String(out).trim() : String(out);
  } catch (err) {
    if (softFail) {
      const stdout = err.stdout != null ? String(err.stdout) : '';
      return trim ? stdout.trim() : stdout;
    }
    const stderr = err.stderr != null ? String(err.stderr).trim() : '';
    const message = stderr || err.message || `${cmd} failed`;
    const wrapped = new Error(message);
    wrapped.status = err.status;
    wrapped.stdout = err.stdout;
    wrapped.stderr = err.stderr;
    throw wrapped;
  }
}

export function tryRun(cmd, args = [], opts = {}) {
  try {
    return { ok: true, out: run(cmd, args, opts) };
  } catch (error) {
    return {
      ok: false,
      out: String(error.stdout || error.stderr || error.message || error),
      status: error.status ?? 1,
    };
  }
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function readText(path) {
  return readFileSync(path, 'utf8');
}

export function exists(path) {
  return existsSync(path);
}

export function hashFile(path) {
  if (!existsSync(path)) return null;
  return sha256(readFileSync(path));
}

export function hashPath(path) {
  if (!existsSync(path)) return null;
  const stats = statSync(path);
  if (stats.isFile()) return hashFile(path);
  if (!stats.isDirectory()) return sha256(`${path}:${stats.mode}:${stats.size}`);
  const entries = readdirSync(path, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => `${entry.name}:${hashPath(join(path, entry.name))}`);
  return sha256(entries.join('\n'));
}

export function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function isProductionPath(filePath) {
  if (!filePath.startsWith('src/')) return false;
  if (filePath.includes('__tests__/')) return false;
  if (/\.test\.[jt]sx?$/.test(filePath)) return false;
  if (filePath.includes('/test/') || filePath.includes('/fixtures/')) return false;
  return true;
}

export function isUiPath(filePath) {
  if (filePath.includes('__tests__/') || /\.test\.[jt]sx?$/.test(filePath)) return false;
  if (filePath.startsWith('docs/')) return false;
  return (
    filePath.startsWith('src/screens/') ||
    filePath.startsWith('src/components/') ||
    filePath.startsWith('src/navigation/') ||
    filePath === 'App.js' ||
    filePath === 'App.tsx' ||
    filePath.startsWith('assets/images/')
  );
}

export function libDir() {
  return dirname(fileURLToPath(import.meta.url));
}
