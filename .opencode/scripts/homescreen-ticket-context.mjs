#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const issueNumber = Number(process.argv[2]);
const allowDirty = process.argv.includes('--allow-dirty');

if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
  console.error('Usage: homescreen-ticket-context.mjs <issue-number> [--allow-dirty]');
  process.exit(1);
}

function run(command, args) {
  return execFileSync(command, args, { encoding: 'utf8' }).trim();
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hashPath(path) {
  const stats = statSync(path);
  if (stats.isFile()) return hash(readFileSync(path));
  if (!stats.isDirectory()) return hash(`${path}:${stats.mode}:${stats.size}`);

  const entries = readdirSync(path, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => `${entry.name}:${hashPath(join(path, entry.name))}`);
  return hash(entries.join('\n'));
}

function readIssue(number) {
  return JSON.parse(
    run('gh', [
      'issue',
      'view',
      String(number),
      '--json',
      'number,title,state,labels,parent,blockedBy,body,comments,url'
    ])
  );
}

const issue = readIssue(issueNumber);
const parent = issue.parent?.number ? readIssue(issue.parent.number) : null;
const designPathPattern = /`(\/home\/[^`\n]*design_handoff_homescreen_redesign\/[^`\n]+)`/g;
const designPaths = [...issue.body.matchAll(designPathPattern)].map((match) => match[1]);
const uniqueDesignPaths = [...new Set(designPaths)];
const design = uniqueDesignPaths.map((path) => ({
  path,
  exists: existsSync(path),
  sha256: existsSync(path) ? hashPath(path) : null
}));
const labels = issue.labels.map((label) => label.name);
const blockers = issue.blockedBy.nodes.map(({ number, state, title, url }) => ({
  number,
  state,
  title,
  url
}));
const expectedLabel = issueNumber === 56 ? 'ready-for-human' : 'ready-for-agent';
const worktree = run('git', ['status', '--porcelain']);
const reasons = [];

if (issue.state !== 'OPEN') reasons.push(`Issue #${issueNumber} is not open.`);
if (parent?.number !== 49) reasons.push(`Issue #${issueNumber} is not a child of #49.`);
if (!labels.includes(expectedLabel)) reasons.push(`Missing ${expectedLabel} triage label.`);
if (blockers.some((blocker) => blocker.state !== 'CLOSED')) reasons.push('One or more blockers are open.');
if (design.length === 0) reasons.push('Ticket names no design handoff files.');
if (design.some((entry) => !entry.exists)) reasons.push('One or more design handoff files are unavailable.');
if (worktree && !allowDirty) reasons.push('Worktree is not clean. Preserve or isolate existing changes before starting.');

const comments = issue.comments.map(({ author, body, createdAt }) => ({
  author: author?.login || null,
  body,
  createdAt
}));
const parentComments = (parent?.comments || []).map(({ author, body, createdAt }) => ({
  author: author?.login || null,
  body,
  createdAt
}));
const authoritySources = {
  issueBody: hash(issue.body),
  issueComments: hash(JSON.stringify(comments)),
  parentBody: parent ? hash(parent.body) : null,
  parentComments: hash(JSON.stringify(parentComments)),
  design: design.map(({ path, sha256 }) => ({ path, sha256 }))
};
const authority = {
  fingerprint: hash(JSON.stringify(authoritySources)),
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
    url: issue.url
  },
  parent: parent
    ? { number: parent.number, title: parent.title, state: parent.state, url: parent.url }
    : null,
  blockers,
  authority,
  repository: {
    branch: run('git', ['branch', '--show-current']),
    head: run('git', ['rev-parse', 'HEAD']),
    worktree
  }
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.ready ? 0 : 2);
