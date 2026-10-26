#!/usr/bin/env node
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { printJson, repoRoot, run, tryRun } from './lib/repo.mjs';

const USAGE =
  'Usage: agent-worktree.mjs <issue> [--dir path] [--branch name] [--base origin/ref]';

function parseArgs(argv) {
  const out = { issue: null, dir: null, branch: null, base: 'origin/main', help: false };
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dir') out.dir = argv[++i];
    else if (arg === '--branch') out.branch = argv[++i];
    else if (arg === '--base') out.base = argv[++i];
    else if (arg === '-h' || arg === '--help') out.help = true;
    else rest.push(arg);
  }
  out.issue = Number(rest[0]);
  return out;
}

function originBranch(base) {
  const match = /^origin\/(.+)$/.exec(base || '');
  if (!match || !match[1]) {
    throw new Error(`Base must be an origin/ ref, got ${base}`);
  }
  return match[1];
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.error(USAGE);
    process.exit(0);
  }
  if (!Number.isInteger(opts.issue) || opts.issue <= 0 || !opts.base) {
    console.error(USAGE);
    process.exit(1);
  }
  const root = repoRoot();
  const parent = dirname(root);
  const dir = resolve(opts.dir || join(parent, `LouisianaFrench-wt-${opts.issue}`));
  const branch = opts.branch || `agent/${opts.issue}-work`;
  const remoteBranch = originBranch(opts.base);

  run('git', ['fetch', 'origin', remoteBranch], { cwd: root });
  run('git', ['rev-parse', '--verify', opts.base], { cwd: root });
  const add = tryRun(
    'git',
    ['worktree', 'add', '-b', branch, dir, opts.base],
    { cwd: root }
  );
  if (!add.ok) {
    printJson({ ok: false, error: add.out, dir, branch });
    process.exit(2);
  }

  const npm = spawnSync('npm', ['ci'], { cwd: dir, encoding: 'utf8', stdio: 'pipe' });
  if (npm.status !== 0) {
    printJson({
      ok: false,
      error: 'npm ci failed',
      detail: `${npm.stdout || ''}${npm.stderr || ''}`.slice(-2000),
      dir,
      branch,
    });
    process.exit(2);
  }

  mkdirSync(join(dir, '.agent'), { recursive: true });
  process.stdout.write(`WORKTREE=${dir}\n`);
  process.stdout.write(`BRANCH=${branch}\n`);
  printJson({ ok: true, worktree: dir, branch, base: opts.base });
}

function invokedAsCli() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

export { originBranch, parseArgs };

if (invokedAsCli()) main();
