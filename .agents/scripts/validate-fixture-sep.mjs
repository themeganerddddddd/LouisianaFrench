#!/usr/bin/env node

import { dirname, join, normalize } from 'node:path';
import { exists, printJson, readText, repoRoot, run } from './lib/repo.mjs';

const SHIPPED_CATALOG =
  /(?:from|require\()\s*['"][^'"]*src\/data\/[^'"]*['"]|src\/data\/(?:cajunLessons|kreoleLessons|catalog)\.json/i;
const IMPORT_SPEC = /(?:from|require\()\s*['"]([^'"]+)['"]/g;
const COMPACT_FIXTURE =
  /(?:from|require\()\s*['"][^'"]*fixtures?[^'"]*['"]|__fixtures__|compactFixture|makeFixture|testFixture|fixtures\/(?:catalog|learnerProgress)/i;

function collectCandidateFiles(root) {
  process.chdir(root);

  const staged = run('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
    allowFail: true
  });
  let files = staged.split('\n').filter(Boolean);

  if (files.length === 0) {
    const unstaged = run('git', ['diff', '--name-only', '--diff-filter=ACMR'], {
      allowFail: true
    });
    files = unstaged.split('\n').filter(Boolean);
  }

  if (files.length === 0) {
    const status = run('git', ['status', '-u', '--porcelain']);
    for (const line of status.split('\n').filter(Boolean)) {
      const path = line.slice(3).includes(' -> ')
        ? line.slice(3).split(' -> ').pop()
        : line.slice(3);
      files.push(path);
    }
  }

  const dirtyTests = testFiles(files);
  if (dirtyTests.length > 0) return dirtyTests;

  const tracked = run('git', ['ls-files', '-z'], { trim: false });
  return testFiles(tracked.split('\0'));
}

function testFiles(paths) {
  return [...new Set(paths.filter(Boolean))].filter(
    (filePath) =>
      /(^|\/)__tests__\//.test(filePath) ||
      /\.test\.[jt]sx?$/.test(filePath) ||
      /\.spec\.[jt]sx?$/.test(filePath)
  );
}

function importsShippedCatalog(content, filePath) {
  if (SHIPPED_CATALOG.test(content)) return true;
  const base = dirname(filePath);
  for (const match of content.matchAll(IMPORT_SPEC)) {
    const spec = match[1];
    if (!spec.startsWith('.')) continue;
    const resolved = normalize(join(base, spec)).split('\\').join('/');
    if (resolved === 'src/data' || resolved.startsWith('src/data/')) return true;
  }
  return false;
}

function main() {
  const strict = process.argv.includes('--strict');
  const root = repoRoot();
  const warnings = [];
  const scanned = [];

  for (const path of collectCandidateFiles(root)) {
    const absolute = path.startsWith('/') ? path : join(root, path);
    if (!exists(absolute)) continue;
    let content;
    try {
      content = readText(absolute);
    } catch {
      continue;
    }
    scanned.push(path);
    if (importsShippedCatalog(content, path) && COMPACT_FIXTURE.test(content)) {
      warnings.push(
        `${path}: imports both shipped catalog JSON under src/data and compact fixtures — keep shipped-data validation separate from behavior fixtures.`
      );
    }
  }

  printJson({
    verdict: warnings.length === 0 || !strict ? 'PASS' : 'BLOCKED',
    reasons: strict ? warnings : [],
    warnings,
    counts: {
      scanned: scanned.length,
      warnings: warnings.length
    }
  });
  process.exit(strict && warnings.length > 0 ? 2 : 0);
}

main();
