#!/usr/bin/env node
import { printJson, repoRoot, run, tryRun } from './lib/repo.mjs';

function parseArgs(argv) {
  return { apply: argv.includes('--apply') };
}

function listWorktrees(root) {
  const out = run('git', ['worktree', 'list', '--porcelain'], { cwd: root });
  const entries = [];
  let current = {};
  for (const line of out.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current.path) entries.push(current);
      current = { path: line.slice('worktree '.length) };
    } else if (line.startsWith('branch ')) {
      current.branch = line.slice('branch '.length).replace('refs/heads/', '');
    } else if (line.startsWith('HEAD ')) {
      current.head = line.slice('HEAD '.length);
    } else if (line === 'bare') current.bare = true;
    else if (line === 'detached') current.detached = true;
  }
  if (current.path) entries.push(current);
  return entries;
}

function isCandidate(entry, root) {
  if (entry.path === root) return false;
  const path = entry.path;
  return (
    /LouisianaFrench-wt-/.test(path) ||
    /\/lf-\d+/.test(path) ||
    /\/tmp\/lf-/.test(path) ||
    /opencode-wt-/.test(path)
  );
}

function mergedIntoMain(root, branch) {
  if (!branch) return false;
  const tip = tryRun('git', ['rev-parse', '--verify', branch], { cwd: root });
  if (!tip.ok) return false;
  const check = tryRun('git', ['merge-base', '--is-ancestor', tip.out, 'origin/main'], {
    cwd: root,
  });
  return check.ok;
}

function prState(branch) {
  if (!branch) return null;
  const r = tryRun('gh', [
    'pr',
    'list',
    '--head',
    branch,
    '--state',
    'all',
    '--json',
    'number,state,url',
    '--limit',
    '1',
  ]);
  if (!r.ok) return null;
  try {
    const list = JSON.parse(r.out);
    return list[0] || null;
  } catch {
    return null;
  }
}

function dirty(path) {
  const r = tryRun('git', ['status', '--porcelain'], { cwd: path });
  return r.ok && Boolean(r.out);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const root = repoRoot();
  tryRun('git', ['fetch', 'origin', 'main'], { cwd: root });
  const entries = listWorktrees(root).filter((e) => isCandidate(e, root));
  const candidates = [];

  for (const entry of entries) {
    const reasons = [];
    if (mergedIntoMain(root, entry.branch)) reasons.push('branch-ancestor-of-origin/main');
    const pr = prState(entry.branch);
    if (pr && (pr.state === 'MERGED' || pr.state === 'CLOSED')) {
      reasons.push(`pr-${pr.state.toLowerCase()}:#${pr.number}`);
    }
    if (!reasons.length) continue;
    const isDirty = dirty(entry.path);
    candidates.push({
      path: entry.path,
      branch: entry.branch || null,
      reasons,
      dirty: isDirty,
      removable: !isDirty,
      pr,
    });
  }

  const removed = [];
  if (opts.apply) {
    for (const c of candidates) {
      if (!c.removable) continue;
      const r = tryRun('git', ['worktree', 'remove', '--force', c.path], { cwd: root });
      removed.push({ path: c.path, ok: r.ok, detail: r.ok ? 'removed' : r.out });
    }
  }

  printJson({
    dryRun: !opts.apply,
    candidates,
    removed,
  });
}

main();
