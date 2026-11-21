#!/usr/bin/env node
/**
 * Agent PR gates: UI evidence → template sections → production LOC.
 * Runs only for AI-generated PRs (the ai-generated label or an agent marker); a human PR passes untouched.
 *
 * Usage:
 *   node .agents/scripts/pr-gates.mjs [--base origin/main] [--body-file path]
 *     [--branch name] [--labels a,b] [--issue N] [--ai]
 *
 * --ai forces the agent gates (pr-ready uses it). In GitHub Actions, writes `ai` and
 * `add_label` to $GITHUB_OUTPUT. Exit 0 on pass or human PR, 1 on failure.
 */

import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exists, printJson, readText, repoRoot } from './lib/repo.mjs';
import {
  AI_LABEL,
  HARD_LOC,
  LARGE_PR_LABEL,
  SOFT_LOC,
  aiMarkers,
  missingTemplateSections,
  prCommitMessages,
  productionLocAdded
} from './lib/pr-rules.mjs';

function usage(code = 1) {
  console.error(
    'Usage: node .agents/scripts/pr-gates.mjs [--base origin/main] [--body-file path] [--branch name] [--labels a,b] [--issue N] [--ai]'
  );
  process.exit(code);
}

function parseArgs(argv) {
  const out = { base: 'origin/main', bodyFile: null, branch: '', labels: [], issue: null, ai: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base') out.base = argv[++i];
    else if (a === '--body-file') out.bodyFile = argv[++i];
    else if (a === '--branch') out.branch = argv[++i] ?? '';
    else if (a === '--labels') out.labels = (argv[++i] ?? '').split(',').map((l) => l.trim()).filter(Boolean);
    else if (a === '--issue') out.issue = argv[++i];
    else if (a === '--ai') out.ai = true;
    else if (a === '-h' || a === '--help') usage(0);
    else usage(1);
  }
  return out;
}

function setOutput(values) {
  if (!process.env.GITHUB_OUTPUT) return;
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    Object.entries(values).map(([k, v]) => `${k}=${v}\n`).join('')
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = repoRoot();
  if (args.bodyFile && !exists(args.bodyFile)) {
    console.error(`Body file not found: ${args.bodyFile}`);
    process.exit(1);
  }
  const body = args.bodyFile ? readText(args.bodyFile) : null;

  const labelled = args.labels.includes(AI_LABEL);
  const markers = aiMarkers({
    body: body ?? '',
    branch: args.branch,
    commitMessages: prCommitMessages(root, args.base)
  });
  const ai = args.ai || labelled || markers.length > 0;
  setOutput({ ai, add_label: !labelled && markers.length > 0 });

  if (!ai) {
    printJson({ ok: true, ai: false, note: 'Human PR: agent gates do not apply.' });
    return;
  }

  const failures = [];
  const warnings = [];

  console.error('→ check-pr-ui-evidence');
  const uiArgs = [join(dirname(fileURLToPath(import.meta.url)), 'check-pr-ui-evidence.mjs'), '--base', args.base];
  if (args.bodyFile) uiArgs.push('--body-file', args.bodyFile);
  if (args.issue) uiArgs.push('--issue', args.issue);
  const ui = spawnSync(process.execPath, uiArgs, { cwd: root, stdio: 'inherit' });
  if (ui.status !== 0) failures.push('ui-evidence');

  if (body == null) {
    console.error('→ no --body-file; skipping PR template section check');
  } else {
    const missing = missingTemplateSections(body);
    if (missing.length > 0) {
      console.error(`Missing PR template sections: ${missing.join(', ')}`);
      failures.push('pr-template');
    }
  }

  const loc = productionLocAdded(root, args.base);
  console.error(`→ production LOC added: ${loc.added} (soft ${SOFT_LOC} / hard ${HARD_LOC}); deleted ${loc.deleted}`);
  const allowLarge = process.env.ALLOW_LARGE_PR === '1' || args.labels.includes(LARGE_PR_LABEL);
  if (loc.added > HARD_LOC && !allowLarge) {
    console.error(
      `Production LOC added (${loc.added}) exceeds ${HARD_LOC}. After the engineer agrees, add the ${LARGE_PR_LABEL} label (or ALLOW_LARGE_PR=1 locally).`
    );
    failures.push('production-loc');
  } else if (loc.added > SOFT_LOC) {
    warnings.push(`production LOC added ${loc.added} exceeds soft guideline ${SOFT_LOC}`);
  }

  printJson({ ok: failures.length === 0, ai: true, markers, failures, warnings, productionLoc: loc });
  process.exit(failures.length === 0 ? 0 : 1);
}

main();
