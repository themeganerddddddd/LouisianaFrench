#!/usr/bin/env node
/**
 * Local PR readiness gates: lint → test → UI evidence → template sections → LOC.
 *
 * Usage:
 *   node .opencode/scripts/pr-ready.mjs [--skip-test] [--issue N] [--body-file path]
 *
 * Exit 0 only if all gates pass.
 * Soft warn at 100 production LOC added; hard fail above 250 unless ALLOW_LARGE_PR=1.
 */

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exists, isProductionPath, readText, repoRoot, run } from './lib/repo.mjs';

const SOFT_LOC = 100;
const HARD_LOC = 250;

const TEMPLATE_SECTIONS = [
  'Overview',
  'Changes',
  'Testing',
  'What a learner sees',
  'Risk',
  'How to revert'
];

function usage(code = 1) {
  console.error(
    'Usage: node .opencode/scripts/pr-ready.mjs [--skip-test] [--issue N] [--body-file path]'
  );
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

function resolveBase(root) {
  for (const candidate of ['origin/main', 'main']) {
    try {
      run('git', ['rev-parse', '--verify', candidate], { cwd: root });
      return candidate;
    } catch {
      /* next */
    }
  }
  throw new Error('Could not resolve base ref (origin/main or main)');
}

function npmRun(root, script) {
  console.error(`→ npm run ${script}`);
  const result = spawnSync('npm', ['run', script], {
    cwd: root,
    stdio: 'inherit',
    env: process.env
  });
  if (result.status !== 0) {
    return { ok: false, status: result.status ?? 1 };
  }
  return { ok: true };
}

function runUiEvidenceCheck(root, args) {
  const script = join(dirname(fileURLToPath(import.meta.url)), 'check-pr-ui-evidence.mjs');
  const cmdArgs = [script];
  if (args.issue != null) cmdArgs.push('--issue', String(args.issue));
  if (args.bodyFile) cmdArgs.push('--body-file', args.bodyFile);
  console.error('→ check-pr-ui-evidence');
  const result = spawnSync(process.execPath, cmdArgs, {
    cwd: root,
    stdio: 'inherit',
    env: process.env
  });
  return { ok: result.status === 0, status: result.status ?? 1 };
}

function checkTemplateSections(body) {
  const missing = [];
  for (const section of TEMPLATE_SECTIONS) {
    const re = new RegExp(`^##\\s+${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'mi');
    if (!re.test(body)) missing.push(section);
  }
  return missing;
}

function productionLocAdded(root, base) {
  const baseSha = run('git', ['merge-base', 'HEAD', base], { cwd: root });
  const numstat = run('git', ['diff', '--numstat', `${baseSha}...HEAD`], {
    cwd: root,
    trim: false
  });
  let added = 0;
  let deleted = 0;
  const counted = [];
  for (const line of numstat.split('\n')) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const [a, d, file] = parts;
    if (a === '-' || d === '-') continue; // binary
    // AGENTS.md production-LOC guideline: app source under src/, not tests/docs/tooling.
    if (!isProductionPath(file)) continue;
    const addN = Number(a);
    const delN = Number(d);
    if (!Number.isFinite(addN) || !Number.isFinite(delN)) continue;
    added += addN;
    deleted += delN;
    counted.push({ file, added: addN, deleted: delN });
  }
  return { added, deleted, counted, base, baseSha };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = repoRoot();
  const failures = [];
  const warnings = [];

  const lint = npmRun(root, 'lint');
  if (!lint.ok) failures.push('lint');

  if (!args.skipTest) {
    const test = npmRun(root, 'test');
    if (!test.ok) failures.push('test');
  } else {
    console.error('→ skipping tests (--skip-test)');
  }

  const ui = runUiEvidenceCheck(root, args);
  if (!ui.ok) failures.push('ui-evidence');

  let body = '';
  if (args.bodyFile) {
    if (!exists(args.bodyFile)) {
      console.error(`Body file not found: ${args.bodyFile}`);
      failures.push('body-file');
    } else {
      body = readText(args.bodyFile);
      const missingSections = checkTemplateSections(body);
      if (missingSections.length > 0) {
        console.error(`Missing PR template sections: ${missingSections.join(', ')}`);
        failures.push('pr-template');
      } else {
        console.error('→ PR template sections present');
      }
    }
  } else {
    console.error('→ no --body-file; skipping PR template section check');
  }

  let loc;
  try {
    const base = resolveBase(root);
    loc = productionLocAdded(root, base);
    console.error(
      `→ production LOC added: ${loc.added} (soft ${SOFT_LOC} / hard ${HARD_LOC}); deleted ${loc.deleted}`
    );
    if (loc.added > HARD_LOC) {
      if (process.env.ALLOW_LARGE_PR === '1') {
        warnings.push(
          `production LOC added ${loc.added} exceeds hard guideline ${HARD_LOC} (ALLOW_LARGE_PR=1)`
        );
      } else {
        console.error(
          `Production LOC added (${loc.added}) exceeds hard guideline ${HARD_LOC}. Set ALLOW_LARGE_PR=1 to override.`
        );
        failures.push('production-loc');
      }
    } else if (loc.added > SOFT_LOC) {
      warnings.push(
        `production LOC added ${loc.added} exceeds soft guideline ${SOFT_LOC}`
      );
    }
  } catch (err) {
    console.error(err.message);
    failures.push('loc-check');
  }

  const summary = {
    ok: failures.length === 0,
    failures,
    warnings,
    productionLoc: loc
      ? { added: loc.added, deleted: loc.deleted, soft: SOFT_LOC, hard: HARD_LOC }
      : null
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exit(failures.length === 0 ? 0 : 1);
}

main();
