#!/usr/bin/env node

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  exists,
  hashFile,
  isProductionPath,
  printJson,
  readText,
  repoRoot,
  run,
  sha256,
  tryRun
} from './lib/repo.mjs';

function parseArgs(argv) {
  const out = { fixedPoint: null, budget: 250, expectPaths: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--fixed-point') out.fixedPoint = argv[++i];
    else if (arg === '--budget') out.budget = Number(argv[++i]);
    else if (arg === '--expect-paths') {
      out.expectPaths = String(argv[++i])
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
    }
  }
  return out;
}

function normalizeComments(comments) {
  const list = Array.isArray(comments) ? comments : comments?.nodes || [];
  return list.map((c) => ({
    author: c.author?.login || c.author?.name || null,
    body: c.body || '',
    createdAt: c.createdAt || null
  }));
}

function adrHashes(root) {
  const dir = join(root, 'docs/adr');
  if (!exists(dir)) return {};
  const hashes = {};
  for (const name of readdirSync(dir)
    .filter((n) => n.endsWith('.md'))
    .sort()) {
    hashes[`docs/adr/${name}`] = hashFile(join(dir, name));
  }
  return hashes;
}

function recomputeAuthority(root, issueNumber) {
  const issue = JSON.parse(
    run('gh', [
      'issue',
      'view',
      String(issueNumber),
      '--json',
      'number,title,state,labels,body,comments,url'
    ])
  );
  const comments = normalizeComments(issue.comments);
  const authoritySources = {
    issueBody: sha256(issue.body || ''),
    issueComments: sha256(JSON.stringify(comments)),
    agentsMd: hashFile(join(root, 'AGENTS.md')),
    reviewMd: hashFile(join(root, 'REVIEW.md')),
    contextMd: hashFile(join(root, 'CONTEXT.md')),
    packageLock: hashFile(join(root, 'package-lock.json')),
    adr: adrHashes(root)
  };
  return {
    issue: issue.number,
    fingerprint: sha256(JSON.stringify(authoritySources)),
    ...authoritySources
  };
}

function collectChangedPaths(fixedPoint) {
  const named = run('git', ['diff', '--name-only', fixedPoint], { allowFail: true });
  const tracked = named.split('\n').filter(Boolean);

  const status = run('git', ['status', '-u', '--porcelain']);
  const untracked = [];
  for (const line of status.split('\n').filter(Boolean)) {
    if (!line.startsWith('??')) continue;
    const pathPart = line.slice(3);
    const path = pathPart.includes(' -> ') ? pathPart.split(' -> ').pop() : pathPart;
    untracked.push(path);
  }
  return [...new Set([...tracked, ...untracked])];
}

function countAddedProductionLines(fixedPoint, productionPaths) {
  if (productionPaths.length === 0) return 0;
  let added = 0;

  const numstat = run('git', ['diff', '--numstat', fixedPoint, '--', ...productionPaths], {
    allowFail: true
  });
  for (const line of numstat.split('\n').filter(Boolean)) {
    const [plus, , path] = line.split('\t');
    if (!path || !isProductionPath(path) || plus === '-') continue;
    added += Number(plus) || 0;
  }

  const status = run('git', ['status', '-u', '--porcelain']);
  for (const line of status.split('\n').filter(Boolean)) {
    if (!line.startsWith('??')) continue;
    const path = line.slice(3);
    if (!productionPaths.includes(path) || !exists(path)) continue;
    const content = readText(path);
    if (!content) continue;
    added += content.endsWith('\n')
      ? content.split('\n').length - 1
      : content.split('\n').length;
  }

  return added;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const root = repoRoot();
  process.chdir(root);

  if (!opts.fixedPoint) {
    console.error(
      'Usage: node .opencode/scripts/validate-drift.mjs --fixed-point <ref> [--budget 250] [--expect-paths path1,path2]'
    );
    process.exit(1);
  }
  if (!Number.isFinite(opts.budget) || opts.budget < 0) {
    printJson({ verdict: 'BLOCKED', reasons: ['--budget must be a non-negative number'] });
    process.exit(2);
  }

  const authPath = join(root, '.agent/authority.json');
  if (!exists(authPath)) {
    printJson({
      verdict: 'BLOCKED',
      reasons: ['Missing .agent/authority.json — run ticket-context --write or validate-authority first.']
    });
    process.exit(2);
  }

  const fixed = tryRun('git', ['rev-parse', '--verify', opts.fixedPoint]);
  if (!fixed.ok) {
    printJson({
      verdict: 'BLOCKED',
      reasons: [`bad fixed-point: ${opts.fixedPoint}`]
    });
    process.exit(2);
  }

  const stored = JSON.parse(readText(authPath));
  const issueNumber = stored.issue ?? stored.issueNumber;
  if (!issueNumber) {
    printJson({
      verdict: 'BLOCKED',
      reasons: ['.agent/authority.json has no issue number.']
    });
    process.exit(2);
  }

  const reasons = [];
  let verdict = 'NO_DRIFT';

  let current;
  try {
    current = recomputeAuthority(root, issueNumber);
  } catch (error) {
    printJson({
      verdict: 'BLOCKED',
      reasons: [`Failed to refresh authority for #${issueNumber}: ${error.message}`]
    });
    process.exit(2);
  }

  if (current.fingerprint !== stored.fingerprint) {
    verdict = 'REPLAN';
    reasons.push('Authority fingerprint changed since .agent/authority.json was captured.');
    if (current.issueBody !== stored.issueBody) reasons.push('issueBody hash changed.');
    if (current.issueComments !== stored.issueComments) reasons.push('issueComments hash changed.');
    if (current.agentsMd !== stored.agentsMd) reasons.push('AGENTS.md hash changed.');
    if (current.reviewMd !== stored.reviewMd) reasons.push('REVIEW.md hash changed.');
    if (current.contextMd !== stored.contextMd) reasons.push('CONTEXT.md hash changed.');
    if (current.packageLock !== stored.packageLock) reasons.push('package-lock.json hash changed.');
    if (JSON.stringify(current.adr) !== JSON.stringify(stored.adr || stored.adrs || {})) {
      reasons.push('docs/adr/*.md hashes changed.');
    }
  }

  const changedPaths = collectChangedPaths(opts.fixedPoint);
  const productionPaths = changedPaths.filter(isProductionPath);

  if (opts.expectPaths) {
    const allowed = new Set(opts.expectPaths);
    const extras = productionPaths.filter((path) => !allowed.has(path));
    if (extras.length > 0) {
      verdict = 'REPLAN';
      reasons.push(`Production paths outside --expect-paths: ${extras.join(', ')}`);
    }
  }

  const addedLines = countAddedProductionLines(opts.fixedPoint, productionPaths);
  if (addedLines > opts.budget) {
    verdict = 'REPLAN';
    reasons.push(`Added production lines ${addedLines} exceed budget ${opts.budget}.`);
  }

  printJson({
    verdict,
    reasons,
    counts: {
      changedFiles: changedPaths.length,
      productionFiles: productionPaths.length,
      addedProductionLines: addedLines,
      budget: opts.budget
    },
    productionPaths,
    changedPaths,
    fixedPoint: fixed.out
  });
  process.exit(verdict === 'NO_DRIFT' ? 0 : 2);
}

main();
