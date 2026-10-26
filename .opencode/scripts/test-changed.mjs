#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { printJson, repoRoot, run, tryRun } from './lib/repo.mjs';

function parseArgs(argv) {
  const out = { base: 'origin/main' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--base') out.base = argv[++i];
  }
  return out;
}

function relatedTests(file) {
  const tests = new Set();
  if (/\.(test|spec)\.[jt]sx?$/.test(file) || file.includes('__tests__/')) {
    tests.add(file);
    return [...tests];
  }
  if (!file.startsWith('src/') || !/\.[jt]sx?$/.test(file)) return [];
  const bare = file.replace(/\.[jt]sx?$/, '');
  const candidates = [
    `${bare}.test.js`,
    `${bare}.test.tsx`,
    `${bare}.test.ts`,
    join(dirname(file), '__tests__', `${bare.split('/').pop()}.test.js`),
    file.replace(/^src\//, 'src/').replace(/\.js$/, '') + '.test.js',
  ];
  // Also common pattern: src/foo/bar.js -> src/foo/__tests__/bar.test.js
  const base = file.split('/').pop().replace(/\.[jt]sx?$/, '');
  candidates.push(join(dirname(file), '__tests__', `${base}.test.js`));
  return candidates.filter((p) => existsSync(p));
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const root = repoRoot();
  process.chdir(root);
  const mb = tryRun('git', ['merge-base', 'HEAD', opts.base]);
  const point = mb.ok ? mb.out : opts.base;
  const changed = run('git', ['diff', '--name-only', `${point}...HEAD`])
    .split('\n')
    .filter(Boolean);

  const tests = [...new Set(changed.flatMap(relatedTests))];
  if (tests.length === 0) {
    printJson({
      ok: true,
      mode: 'full-suite-fallback',
      reason: 'no related tests found in diff',
      changed,
    });
    const full = spawnSync('npm', ['test'], { cwd: root, encoding: 'utf8', stdio: 'inherit' });
    process.exit(full.status ?? 1);
  }

  printJson({ ok: true, mode: 'targeted', tests });
  const result = spawnSync('npx', ['jest', '--watchAll=false', ...tests], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  process.exit(result.status ?? 1);
}

main();
