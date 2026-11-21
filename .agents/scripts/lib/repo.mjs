#!/usr/bin/env node
/**
 * Shared helpers for .agents/scripts (Node ESM, builtins only).
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

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

export function readText(path) {
  return readFileSync(path, 'utf8');
}

export function exists(path) {
  return existsSync(path);
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

