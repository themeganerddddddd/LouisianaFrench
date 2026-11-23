/**
 * Pull request rules for agent-generated PRs. Shared by pr-gates.mjs (CI) and pr-ready.mjs (local).
 */

import { isProductionPath, run } from './repo.mjs';

export const AI_LABEL = 'ai-generated';
export const LARGE_PR_LABEL = 'large-pr-approved';
export const SOFT_LOC = 100;
export const HARD_LOC = 250;

// pstack's opening-a-pr headings; Scope and Tradeoffs may be dropped when empty.
const TEMPLATE_SECTIONS = ['Why', 'What changed', 'Blast Radius', 'Verification'];

// Agents open PRs from the maintainer's account, so authorship cannot tell them apart.
// These markers are what agent tooling leaves behind; a human-written PR has none of them.
const BODY_MARKERS = [/Generated with \[Claude Code\]/i, /Made with \[Cursor\]/i];
const COMMIT_MARKERS = [
  /^Co-authored-by: Cursor <cursoragent@cursor\.com>/im,
  /^Co-authored-by: Claude\b[^<]*<noreply@anthropic\.com>/im
];
const BRANCH_MARKER = /^(agent|cursor|claude|codex|opencode)\//;

export function aiMarkers({ body = '', branch = '', commitMessages = [] }) {
  const markers = [];
  if (BODY_MARKERS.some((re) => re.test(body))) markers.push('body footer');
  if (commitMessages.some((msg) => COMMIT_MARKERS.some((re) => re.test(msg)))) {
    markers.push('commit co-author trailer');
  }
  if (BRANCH_MARKER.test(branch)) markers.push(`branch ${branch}`);
  return markers;
}

export function missingTemplateSections(body) {
  return TEMPLATE_SECTIONS.filter(
    (section) => !new RegExp(`^##\\s+${section}\\s*$`, 'mi').test(body)
  );
}

export function prCommitMessages(root, base) {
  return run('git', ['log', '--format=%B%x00', `${base}..HEAD`], { cwd: root, trim: false })
    .split('\0')
    .filter((msg) => msg.trim());
}

export function productionLocAdded(root, base) {
  const baseSha = run('git', ['merge-base', 'HEAD', base], { cwd: root });
  const numstat = run('git', ['diff', '--numstat', `${baseSha}...HEAD`], { cwd: root, trim: false });
  let added = 0;
  let deleted = 0;
  for (const line of numstat.split('\n')) {
    const [a, d, file] = line.split('\t');
    if (!file || a === '-' || d === '-') continue; // binary
    // AGENTS.md production-LOC guideline: app source under src/, not tests/docs/tooling.
    if (!isProductionPath(file)) continue;
    added += Number(a);
    deleted += Number(d);
  }
  return { added, deleted };
}
