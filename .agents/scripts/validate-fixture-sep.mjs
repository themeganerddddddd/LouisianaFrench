#!/usr/bin/env node

import { readdirSync } from 'node:fs';
import { dirname, join, normalize, relative, resolve, sep } from 'node:path';
import { exists, printJson, readText, repoRoot, run } from './lib/repo.mjs';

const SHIPPED_CATALOG =
  /(?:from|require\()\s*['"][^'"]*src\/data\/[^'"]*['"]|src\/data\/(?:cajunLessons|kreoleLessons|catalog)\.json/i;
const IMPORT_SPEC = /(?:from|require\()\s*['"]([^'"]+)['"]/g;
const COMPACT_FIXTURE =
  /(?:from|require\()\s*['"][^'"]*fixtures?[^'"]*['"]|__fixtures__|compactFixture|makeFixture|testFixture|fixtures\/(?:catalog|learnerProgress)/i;

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.expo',
  'android',
  'ios'
]);

function collectCandidateFiles(root) {
  process.chdir(root);
  const dirtyTests = dirtyTestFiles(root);
  if (dirtyTests.length > 0) return dirtyTests;
  return walkTestFiles(root);
}

function dirtyTestFiles(root) {
  if (!exists(join(root, '.git'))) return [];

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
      const filePath = line.slice(3).includes(' -> ')
        ? line.slice(3).split(' -> ').pop()
        : line.slice(3);
      files.push(filePath);
    }
  }

  return testFiles(files);
}

function walkTestFiles(root) {
  const found = [];

  const visit = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const absolute = join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      found.push(relative(root, absolute).split(sep).join('/'));
    }
  };

  visit(root);
  return testFiles(found);
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

function scanRoot(argv) {
  const index = argv.indexOf('--root');
  if (index === -1) {
    try {
      return repoRoot();
    } catch {
      return process.cwd();
    }
  }
  const value = argv[index + 1];
  if (!value || value.startsWith('-')) {
    throw new Error('--root requires a directory');
  }
  return resolve(value);
}

function main() {
  const argv = process.argv.slice(2);
  const strict = argv.includes('--strict');
  const root = scanRoot(argv);
  const warnings = [];
  const scanned = [];

  for (const filePath of collectCandidateFiles(root)) {
    const absolute = filePath.startsWith('/') ? filePath : join(root, filePath);
    if (!exists(absolute)) continue;
    let content;
    try {
      content = readText(absolute);
    } catch {
      continue;
    }
    scanned.push(filePath);
    if (importsShippedCatalog(content, filePath) && COMPACT_FIXTURE.test(content)) {
      warnings.push(
        `${filePath}: imports both shipped catalog JSON under src/data and compact fixtures — keep shipped-data validation separate from behavior fixtures.`
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
