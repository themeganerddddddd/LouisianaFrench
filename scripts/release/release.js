#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const readline = require('node:readline');
const path = require('node:path');
const { parseArgs, planRelease } = require('./plan');

const ROOT = process.cwd();
const USAGE = `Usage: npm run release -- [release|preflight|status] [flags]

  --platform ios|android|all   default: all
  --build production|preview   default: production (preview = install links, dev database)
  --track internal|closed|open Android track for production builds, default: internal
  --no-submit                  build only, skip store upload
  --submit-only                submit the latest production build without rebuilding
  --dry-run                    show the plan and the eas commands, run nothing
  --yes                        skip the confirmation prompt`;

function capture(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8' });
  if (result.error || result.status !== 0) return null;
  return result.stdout.trim();
}

function environmentHost(name) {
  const out = capture('eas', ['env:list', name, '--include-sensitive', '--format', 'short']);
  const line = (out || '').split('\n').find((l) => l.startsWith('EXPO_PUBLIC_SUPABASE_URL='));
  if (!line) return null;
  try {
    return new URL(line.slice(line.indexOf('=') + 1).replace(/"/g, '')).host;
  } catch {
    return null;
  }
}

function gatherContext() {
  capture('git', ['fetch', 'origin', 'main', '--quiet']);
  const appJson = require(path.join(ROOT, 'app.json'));
  return {
    appVersion: appJson.expo.version,
    branch: capture('git', ['branch', '--show-current']),
    hasTrackedChanges: Boolean(capture('git', ['status', '--porcelain', '--untracked-files=no'])),
    matchesOrigin: capture('git', ['rev-parse', 'HEAD']) === capture('git', ['rev-parse', 'origin/main']),
    environments: { production: environmentHost('production'), preview: environmentHost('preview') }
  };
}

function confirm(question) {
  if (!process.stdin.isTTY) return Promise.resolve(false);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

function eas(args) {
  const result = spawnSync('eas', args, { cwd: ROOT, stdio: 'inherit' });
  if (result.error) throw new Error(`Could not run eas (${result.error.message}). Install it with: npm install -g eas-cli`);
  return result.status;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.command === 'status') {
    eas(['build:list', '--limit', '5', '--non-interactive']);
    return eas(['submit:list', '--limit', '5', '--non-interactive']);
  }

  const plan = planRelease(options, gatherContext());
  plan.summary.forEach((line) => console.log(line));
  plan.warnings.forEach((line) => console.log(`warning: ${line}`));
  plan.errors.forEach((line) => console.error(`error: ${line}`));
  if (plan.errors.length) return 1;
  if (options.command === 'preflight') {
    console.log('Preflight passed.');
    return 0;
  }

  plan.steps.forEach((args) => console.log(`$ eas ${args.join(' ')}`));
  if (options.dryRun) return 0;
  if (!options.yes && !(await confirm('Continue? [y/N] '))) {
    console.error('Cancelled (pass --yes to skip the prompt in non-interactive shells).');
    return 1;
  }

  for (const args of plan.steps) {
    const status = eas(args);
    if (status !== 0) return status || 1;
  }
  if (options.build === 'production' && options.submit && !options.submitOnly) {
    console.log('Done. TestFlight processing takes ~10-30 min; Play testers must opt in. Check: npm run release -- status');
  }
  return 0;
}

main().then(
  (code) => process.exit(code || 0),
  (error) => {
    console.error(`error: ${error.message}\n\n${USAGE}`);
    process.exit(1);
  }
);
