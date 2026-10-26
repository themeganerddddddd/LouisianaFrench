#!/usr/bin/env node
/**
 * Scaffold docs/evidence/<issue>/ and optionally capture a Playwright screenshot.
 * Prints paste-ready markdown for the PR **What a learner sees** section.
 *
 * Usage:
 *   node .opencode/scripts/capture-ui-evidence.mjs <issue>
 *     [--url http://localhost:8081] [--out-name 00-shot.png]
 *
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { exists, repoRoot, run } from './lib/repo.mjs';

const OWNER_REPO = 'themeganerddddddd/LouisianaFrench';
const README_PLACEHOLDER = `# Evidence for issue

## Click path

1. TODO: describe what was clicked
2. TODO: what the learner saw

Capture files in this folder (png/jpg/webp/gif/mp4/webm/mov), resize to 50% before commit, then paste raw.githubusercontent.com links into the PR **What a learner sees** section.
`;

function usage(code = 1) {
  console.error(
    'Usage: node .opencode/scripts/capture-ui-evidence.mjs <issue> [--url http://localhost:8081] [--out-name 00-shot.png]'
  );
  process.exit(code);
}

function parseArgs(argv) {
  const out = { issue: null, url: null, outName: '00-shot.png' };
  const positionals = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--url') out.url = argv[++i];
    else if (a === '--out-name') out.outName = argv[++i];
    else if (a === '-h' || a === '--help') usage(0);
    else if (a.startsWith('-')) usage(1);
    else positionals.push(a);
  }
  if (positionals.length !== 1) usage(1);
  const issue = Number(positionals[0]);
  if (!Number.isInteger(issue) || issue <= 0) usage(1);
  out.issue = issue;
  if (!out.outName || /[\\/]/.test(out.outName)) {
    console.error('--out-name must be a simple file name (no path separators)');
    process.exit(1);
  }
  return out;
}

function gitMeta(root) {
  let branch = 'HEAD';
  try {
    branch = run('git', ['branch', '--show-current'], { cwd: root }) || 'HEAD';
  } catch {
    branch = 'HEAD';
  }
  let sha = 'HEAD';
  try {
    sha = run('git', ['rev-parse', 'HEAD'], { cwd: root });
  } catch {
    sha = 'HEAD';
  }
  const shortSha = sha.length >= 7 ? sha.slice(0, 7) : sha;
  return { branch, sha, shortSha };
}

function rawUrl(sha, relativePath) {
  return `https://raw.githubusercontent.com/${OWNER_REPO}/${sha}/${relativePath}`;
}

function tryPlaywrightScreenshot(url, outPath) {
  try {
    run(
      'npx',
      [
        '--yes',
        'playwright',
        'screenshot',
        '--wait-for-timeout=2000',
        url,
        outPath
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: (err.stderr && String(err.stderr).trim()) || err.message || String(err)
    };
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = repoRoot();
  const dir = join(root, 'docs', 'evidence', String(args.issue));
  mkdirSync(dir, { recursive: true });

  const readmePath = join(dir, 'README.md');
  if (!exists(readmePath)) {
    writeFileSync(readmePath, README_PLACEHOLDER, 'utf8');
    console.error(`Wrote ${readmePath}`);
  } else {
    console.error(`Kept existing ${readmePath}`);
  }

  let capturedRel = null;
  if (args.url) {
    const outPath = join(dir, args.outName);
    console.error(`Capturing ${args.url} → ${outPath}`);
    const result = tryPlaywrightScreenshot(args.url, outPath);
    if (result.ok) {
      capturedRel = `docs/evidence/${args.issue}/${args.outName}`;
      console.error(`Screenshot saved: ${capturedRel}`);
    } else {
      console.error('Playwright screenshot failed.');
      console.error(result.message);
      console.error('');
      console.error('Manual capture instructions:');
      console.error(`  1. Open the app (emulator, device, or ${args.url}).`);
      console.error('  2. Drive the learner click path for this change.');
      console.error(`  3. Save grabs/video under docs/evidence/${args.issue}/`);
      console.error('  4. Resize each grab to 50% width/height before commit.');
      console.error('  5. Re-run this script without --url to print PR markdown, or paste links yourself.');
    }
  }

  const { branch, sha, shortSha } = gitMeta(root);
  const mediaHint =
    capturedRel ||
    `docs/evidence/${args.issue}/01-example.png`;

  const md = `## What a learner sees

TODO: say what was clicked and what happened.

| Step | Grab |
| --- | --- |
| TODO step | ![TODO](${rawUrl(sha, mediaHint)}) |

Branch \`${branch}\` @ \`${shortSha}\` (\`${sha}\`).

Or video:
${rawUrl(sha, `docs/evidence/${args.issue}/01-example.mp4`)}
`;

  process.stdout.write(`${md}\n`);

}

main();
