#!/usr/bin/env node
/**
 * Local PR readiness for agents: lint → typecheck → test → the same agent gates CI runs (pr-gates.mjs).
 *
 * Usage:
 *   node .agents/scripts/pr-ready.mjs [--skip-test] [--issue N] [--body-file path]
 *
 * Exit 0 only if all gates pass. ALLOW_LARGE_PR=1 allows more than 250 production LOC.
 */

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from './lib/repo.mjs';

function usage(code = 1) {
  console.error('Usage: node .agents/scripts/pr-ready.mjs [--skip-test] [--issue N] [--body-file path]');
  process.exit(code);
}

function parseArgs(argv) {
  const out = { skipTest: false, issue: null, bodyFile: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--skip-test') out.skipTest = true;
    else if (a === '--issue') out.issue = argv[++i];
    else if (a === '--body-file') out.bodyFile = argv[++i];
    else if (a === '-h' || a === '--help') usage(0);
    else usage(1);
  }
  return out;
}

function step(label, cmd, cmdArgs, root) {
  console.error(`→ ${label}`);
  return spawnSync(cmd, cmdArgs, { cwd: root, stdio: 'inherit' }).status === 0;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = repoRoot();
  const failures = [];

  if (!step('npm run lint', 'npm', ['run', 'lint'], root)) failures.push('lint');
  if (!step('npm run typecheck', 'npm', ['run', 'typecheck'], root)) failures.push('typecheck');
  if (args.skipTest) console.error('→ skipping tests (--skip-test)');
  else if (!step('npm run test', 'npm', ['run', 'test'], root)) failures.push('test');

  const gates = [join(dirname(fileURLToPath(import.meta.url)), 'pr-gates.mjs'), '--ai'];
  if (args.bodyFile) gates.push('--body-file', args.bodyFile);
  if (args.issue) gates.push('--issue', args.issue);
  if (!step('agent PR gates', process.execPath, gates, root)) failures.push('pr-gates');

  console.error(failures.length ? `pr-ready: FAILED (${failures.join(', ')})` : 'pr-ready: ok');
  process.exit(failures.length ? 1 : 0);
}

main();
