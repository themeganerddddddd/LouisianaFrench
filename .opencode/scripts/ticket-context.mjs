#!/usr/bin/env node

import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  exists,
  hashFile,
  printJson,
  repoRoot,
  run,
  sha256,
  tryRun
} from './lib/repo.mjs';

function parseArgs(argv) {
  const out = { issue: null, write: false, allowDirty: false };
  const rest = [];
  for (const arg of argv) {
    if (arg === '--write') out.write = true;
    else if (arg === '--allow-dirty') out.allowDirty = true;
    else rest.push(arg);
  }
  out.issue = Number(rest[0]);
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

function normalizeBlockers(blockedBy) {
  const nodes = blockedBy?.nodes || (Array.isArray(blockedBy) ? blockedBy : []);
  return nodes.map((node) => ({
    number: node.number,
    state: node.state,
    title: node.title || null,
    url: node.url || null
  }));
}

function fetchIssue(number) {
  const fields = 'number,title,state,labels,body,comments,url';
  const withBlockers = tryRun('gh', [
    'issue',
    'view',
    String(number),
    '--json',
    `${fields},blockedBy`
  ]);
  if (withBlockers.ok) return JSON.parse(withBlockers.out);
  return JSON.parse(run('gh', ['issue', 'view', String(number), '--json', fields]));
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
  const opts = parseArgs(process.argv.slice(2));
  if (!Number.isInteger(opts.issue) || opts.issue <= 0) {
    console.error('Usage: node .opencode/scripts/ticket-context.mjs <issue> [--write] [--allow-dirty]');
    process.exit(1);
  }

  const root = repoRoot();
  process.chdir(root);

  const issue = fetchIssue(opts.issue);
  const labels = (issue.labels || []).map((l) => (typeof l === 'string' ? l : l.name));
  const comments = normalizeComments(issue.comments);
  const blockers = normalizeBlockers(issue.blockedBy);
  const dirty = run('git', ['status', '--porcelain']);

  const reasons = [];
  if (issue.state !== 'OPEN') reasons.push(`Issue #${opts.issue} is not open.`);
  if (!labels.includes('ready-for-agent') && !labels.includes('ready-for-human')) {
    reasons.push('Missing ready-for-agent or ready-for-human triage label.');
  }
  if (blockers.some((b) => b.state && b.state !== 'CLOSED')) {
    reasons.push('One or more blockers are open.');
  }
  if (dirty && !opts.allowDirty) {
    reasons.push('Worktree is not clean. Preserve or isolate existing changes before starting.');
  }

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

  const result = {
    ready: reasons.length === 0,
    reasons,
    issue: {
      number: issue.number,
      title: issue.title,
      state: issue.state,
      labels,
      body: issue.body || '',
      comments,
      url: issue.url,
      blockedBy: blockers
    },
    authority,
    repository: {
      branch: tryRun('git', ['branch', '--show-current']).out || null,
      head: tryRun('git', ['rev-parse', 'HEAD']).out || null,
      worktree: dirty
    }
  };

  if (opts.write) {
    const agentDir = join(root, '.agent');
    mkdirSync(agentDir, { recursive: true });

    const lines = [
      '---',
      `issue: ${issue.number}`,
      `title: ${JSON.stringify(issue.title)}`,
      `state: ${issue.state}`,
      `url: ${issue.url}`,
      `ready: ${result.ready}`,
      '---',
      '',
      `# Issue #${issue.number}: ${issue.title}`,
      '',
      `State: ${issue.state}`,
      `Labels: ${labels.join(', ') || '(none)'}`,
      `URL: ${issue.url}`,
      '',
      '## Body',
      '',
      issue.body || '_(empty)_',
      '',
      '## Comments',
      ''
    ];

    if (comments.length === 0) {
      lines.push('_(none)_', '');
    } else {
      for (const comment of comments) {
        lines.push(
          `### ${comment.author || 'unknown'} — ${comment.createdAt || 'unknown time'}`,
          '',
          comment.body,
          ''
        );
      }
    }

    if (blockers.length > 0) {
      lines.push('## Blocked by', '');
      for (const blocker of blockers) {
        lines.push(`- #${blocker.number} (${blocker.state}): ${blocker.title || ''}`);
      }
      lines.push('');
    }

    writeFileSync(join(agentDir, 'issue.md'), `${lines.join('\n')}\n`);
    writeFileSync(join(agentDir, 'authority.json'), `${JSON.stringify(authority, null, 2)}\n`);
  }

  printJson(result);
  process.exit(result.ready ? 0 : 2);
}

main();
