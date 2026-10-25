#!/usr/bin/env node
/**
 * Gate: UI diffs require docs/evidence/<issue>/ media + PR body raw links.
 *
 * Usage:
 *   node .opencode/scripts/check-pr-ui-evidence.mjs [--base origin/main]
 *     [--body-file path] [--issue N] [--allow-non-ui] [--stdin]
 *
 * Always prints JSON to stdout. Exit 0 on pass, 2 on fail, 1 on usage/error.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { exists, readText, repoRoot, run } from './lib/repo.mjs';

const MEDIA_RE = /\.(png|jpe?g|webp|gif|mp4|webm|mov)$/i;
const NON_UI_ATTEST_RE = /does not change the UI|no UI change|non-UI/i;
const ISSUE_IN_BODY_RE = /(?:closes|fixes|resolves)?\s*#(\d{1,5})\b/i;
const ISSUE_IN_BRANCH_RE = /(\d{2,4})/;

const UI_PREFIXES = [
  'src/screens/',
  'src/components/',
  'src/navigation/',
  'assets/images/'
];
const UI_ROOT_FILES = new Set(['App.js', 'App.tsx']);

function usage(code = 1) {
  console.error(
    'Usage: node .opencode/scripts/check-pr-ui-evidence.mjs [--base origin/main] [--body-file path] [--issue N] [--allow-non-ui] [--stdin]'
  );
  process.exit(code);
}

function parseArgs(argv) {
  const out = {
    base: null,
    bodyFile: null,
    issue: null,
    allowNonUi: false,
    stdin: false
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base') out.base = argv[++i];
    else if (a === '--body-file') out.bodyFile = argv[++i];
    else if (a === '--issue') out.issue = Number(argv[++i]);
    else if (a === '--allow-non-ui') out.allowNonUi = true;
    else if (a === '--stdin') out.stdin = true;
    else if (a === '-h' || a === '--help') usage(0);
    else usage(1);
  }
  if (out.issue != null && (!Number.isInteger(out.issue) || out.issue <= 0)) {
    usage(1);
  }
  return out;
}

function printJson(obj) {
  process.stdout.write(`${JSON.stringify(obj, null, 2)}\n`);
}

function fail(payload) {
  printJson({ ok: false, ...payload });
  process.exit(2);
}

function pass(payload) {
  printJson({ ok: true, ...payload });
  process.exit(0);
}

function resolveBase(root, requested) {
  if (requested) {
    try {
      run('git', ['rev-parse', '--verify', requested], { cwd: root });
      return requested;
    } catch {
      throw new Error(`Base ref not found: ${requested}`);
    }
  }
  for (const candidate of ['origin/main', 'main']) {
    try {
      run('git', ['rev-parse', '--verify', candidate], { cwd: root });
      return candidate;
    } catch {
      /* try next */
    }
  }
  throw new Error('Could not resolve base ref (tried origin/main, main)');
}

function mergeBase(root, base) {
  return run('git', ['merge-base', 'HEAD', base], { cwd: root });
}

function changedFiles(root, baseSha) {
  const out = run('git', ['diff', '--name-only', `${baseSha}...HEAD`], {
    cwd: root,
    trim: false
  });
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizePath(p) {
  return p.split(sep).join('/');
}

function isExcludedFromUi(path) {
  const n = normalizePath(path);
  if (n.startsWith('docs/')) return true;
  if (n.includes('/__tests__/') || n.includes('__tests__/')) return true;
  if (/\.test\.[^/]+$/i.test(n)) return true;
  return false;
}

function isUiPath(path) {
  const n = normalizePath(path);
  if (isExcludedFromUi(n)) return false;
  if (UI_ROOT_FILES.has(n)) return true;
  return UI_PREFIXES.some((prefix) => n === prefix.slice(0, -1) || n.startsWith(prefix));
}

function readBody(args) {
  if (args.bodyFile) {
    if (!exists(args.bodyFile)) {
      throw new Error(`Body file not found: ${args.bodyFile}`);
    }
    return readText(args.bodyFile);
  }
  if (process.env.PR_BODY != null && process.env.PR_BODY !== '') {
    return process.env.PR_BODY;
  }
  if (args.stdin) {
    return readFileSync(0, 'utf8');
  }
  return '';
}

function resolveIssue(args, body, root) {
  if (args.issue != null) return args.issue;
  const fromBody = body.match(ISSUE_IN_BODY_RE);
  if (fromBody) return Number(fromBody[1]);
  let branch = '';
  try {
    branch = run('git', ['branch', '--show-current'], { cwd: root });
  } catch {
    branch = '';
  }
  const fromBranch = branch.match(ISSUE_IN_BRANCH_RE);
  if (fromBranch) return Number(fromBranch[1]);
  return null;
}

function listEvidenceMedia(root, issue) {
  const dir = join(root, 'docs', 'evidence', String(issue));
  if (!exists(dir) || !statSync(dir).isDirectory()) {
    return { dir, files: [] };
  }
  const files = readdirSync(dir)
    .filter((name) => MEDIA_RE.test(name))
    .map((name) => relative(root, join(dir, name)).split(sep).join('/'));
  return { dir: relative(root, dir).split(sep).join('/'), files };
}

function bodyHasEvidenceLink(body) {
  return /raw\.githubusercontent\.com/i.test(body);
}

function bodyHasNonUiAttestation(body) {
  return NON_UI_ATTEST_RE.test(body);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = repoRoot();

  let base;
  let baseSha;
  try {
    base = resolveBase(root, args.base);
    baseSha = mergeBase(root, base);
  } catch (err) {
    printJson({ ok: false, error: err.message });
    process.exit(1);
  }

  const files = changedFiles(root, baseSha);
  const uiFiles = files.filter(isUiPath);

  if (uiFiles.length === 0) {
    pass({
      reason: 'non-ui-diff',
      base,
      baseSha,
      changedCount: files.length,
      uiFiles: []
    });
  }

  let body = '';
  try {
    body = readBody(args);
  } catch (err) {
    printJson({ ok: false, error: err.message });
    process.exit(1);
  }

  const issue = resolveIssue(args, body, root);
  const missing = [];
  const evidence = issue != null ? listEvidenceMedia(root, issue) : { dir: null, files: [] };

  if (issue == null) {
    missing.push('issue-number');
  } else if (evidence.files.length === 0) {
    missing.push('evidence-media');
  }

  const hasLink = bodyHasEvidenceLink(body);
  const hasAttest = bodyHasNonUiAttestation(body);

  if (!hasLink) {
    if (hasAttest && args.allowNonUi) {
      // Misclassified UI paths: attestation + explicit allow passes.
    } else if (hasAttest && !args.allowNonUi) {
      missing.push('raw.githubusercontent.com-link');
      missing.push('allow-non-ui-required-for-attestation');
    } else {
      missing.push('raw.githubusercontent.com-link');
    }
  }

  if (missing.length > 0) {
    fail({
      reason: 'ui-evidence-incomplete',
      base,
      baseSha,
      uiFiles,
      issue,
      evidenceDir: evidence.dir,
      evidenceFiles: evidence.files,
      hasRawGithubLink: hasLink,
      hasNonUiAttestation: hasAttest,
      allowNonUi: args.allowNonUi,
      missing
    });
  }

  pass({
    reason: hasLink ? 'ui-evidence-ok' : 'ui-attestation-allowed',
    base,
    baseSha,
    uiFiles,
    issue,
    evidenceDir: evidence.dir,
    evidenceFiles: evidence.files,
    hasRawGithubLink: hasLink,
    hasNonUiAttestation: hasAttest,
    allowNonUi: args.allowNonUi
  });
}

main();
