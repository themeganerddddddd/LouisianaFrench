#!/usr/bin/env node

import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  exists,
  hashFile,
  printJson,
  readText,
  repoRoot,
  run,
  sha256
} from './lib/repo.mjs';

function parseIssueFromFrontMatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    const heading = text.match(/#\s*Issue\s*#(\d+)/i);
    return heading ? Number(heading[1]) : null;
  }
  const issueLine = match[1].split(/\r?\n/).find((line) => /^\s*issue\s*:/i.test(line));
  if (!issueLine) return null;
  const value = issueLine.split(':').slice(1).join(':').trim().replace(/^["']|["']$/g, '');
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function resolveIssueNumber(root, positional) {
  if (positional[0]) {
    const number = Number(positional[0]);
    if (!Number.isInteger(number) || number <= 0) {
      console.error('Usage: node .opencode/scripts/validate-authority.mjs [<issue>]');
      process.exit(1);
    }
    return number;
  }
  if (process.env.AUTHORITY_ISSUE) {
    const number = Number(process.env.AUTHORITY_ISSUE);
    if (Number.isInteger(number) && number > 0) return number;
  }
  const issueMd = join(root, '.agent/issue.md');
  if (exists(issueMd)) {
    const fromFile = parseIssueFromFrontMatter(readText(issueMd));
    if (fromFile) return fromFile;
  }
  console.error(
    'Usage: node .opencode/scripts/validate-authority.mjs [<issue>]\n' +
      'Provide an issue number, AUTHORITY_ISSUE, or .agent/issue.md with issue front matter.'
  );
  process.exit(1);
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

function main() {
  const root = repoRoot();
  process.chdir(root);
  const argv = process.argv.slice(2);
  const issueFlagIdx = argv.indexOf('--issue');
  const fromFlag =
    issueFlagIdx !== -1 && argv[issueFlagIdx + 1] ? Number(argv[issueFlagIdx + 1]) : null;
  const positional = argv.filter((a, i) => {
    if (a === '--issue') return false;
    if (issueFlagIdx !== -1 && i === issueFlagIdx + 1) return false;
    return !a.startsWith('--');
  });
  if (Number.isInteger(fromFlag) && fromFlag > 0) positional.unshift(String(fromFlag));
  const issueNumber = resolveIssueNumber(root, positional);

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

  const authority = {
    issue: issue.number,
    capturedAt: new Date().toISOString(),
    fingerprint: sha256(JSON.stringify(authoritySources)),
    ...authoritySources
  };

  const agentDir = join(root, '.agent');
  mkdirSync(agentDir, { recursive: true });
  writeFileSync(join(agentDir, 'authority.json'), `${JSON.stringify(authority, null, 2)}\n`);

  printJson(authority);
  process.exit(0);
}

main();
