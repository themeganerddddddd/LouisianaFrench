#!/usr/bin/env node
// Safe migration runner. Decisions live in checks.js so tests can load them without a database.

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const checks = require('./checks.js');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let secrets = { url: '', password: '' };

function readEnvFile() {
  try {
    return fs.readFileSync(path.join(root, '.env.db.local'), 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return '';
    throw error;
  }
}

function loadLocal() {
  const dir = path.join(root, 'supabase', 'migrations');
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('supabase/migrations is missing.');
    throw error;
  }
  const rows = [];
  const blocks = [];
  for (const file of names.filter((name) => name.endsWith('.sql')).sort()) {
    const row = checks.parseMigrationFileName(file);
    if (!row) blocks.push({ kind: 'bad-filename', file });
    else rows.push(row);
  }
  return { rows, blocks };
}

function writeOut(text) {
  if (!text) return;
  process.stdout.write(checks.redact(text.endsWith('\n') ? text : `${text}\n`, secrets));
}

function writeErr(text) {
  if (!text) return;
  process.stderr.write(checks.redact(text.endsWith('\n') ? text : `${text}\n`, secrets));
}

async function readRemote(url) {
  const command = checks.historyCommand(url);
  const result = await checks.runCaptured(command.cmd, command.args, secrets);
  if (result.code !== 0) {
    if (checks.missingHistory(result.stderr)) return [];
    throw new Error(result.stderr.trim() || result.stdout.trim() || 'Could not read migration history.');
  }
  writeErr(result.stderr);
  return checks.parseHistoryTuples(result.stdout);
}

async function runCommand(command) {
  writeOut(`→ ${checks.formatCommand(command.cmd, command.args, secrets)}`);
  const result = await checks.runCaptured(command.cmd, command.args, secrets);
  writeOut(result.stdout);
  writeErr(result.stderr);
  return result;
}

async function main() {
  const parsed = checks.parseArgs(process.argv.slice(2));
  const url = checks.resolveDatabaseUrl({
    env: parsed.env,
    processEnv: process.env,
    fileText: readEnvFile()
  });
  let password = '';
  try {
    password = new URL(url).password;
  } catch {
    throw new Error('Database URL is not a valid postgres URL.');
  }
  secrets = { url, password };
  const target = checks.assertTarget({ env: parsed.env, url, confirm: parsed.confirm });
  writeOut([
    `env ${parsed.env}`,
    `ref ${target.ref}`,
    `host ${target.host}`,
    `port ${target.port}`
  ].join('\n'));

  const verifyPath = path.join(root, 'scripts', 'db', 'verify.sql');
  if (parsed.command === 'verify') {
    const [command] = checks.commandsFor({
      command: 'verify', dbUrl: url, workdir: root, verifyPath
    });
    const result = await runCommand(command);
    process.exit(result.code === 0 ? 0 : result.code || 1);
  }

  const remote = await readRemote(url);
  const local = loadLocal();
  const checked = checks.checkHistory(local.rows, remote);
  const history = local.blocks.length === 0 ? checked : {
    ok: false,
    blocks: local.blocks.concat(checked.blocks),
    pending: checked.pending
  };
  writeOut(checks.formatHistory(history));
  if (!history.ok || parsed.command === 'status') {
    process.exit(history.ok ? 0 : 1);
  }

  const commands = checks.commandsFor({
    command: parsed.command, dbUrl: url, workdir: root, verifyPath
  });
  const outcome = await checks.runSteps({
    history,
    commands,
    run: runCommand
  });
  process.exit(outcome.code === 0 ? 0 : outcome.code || 1);
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (entry && fileURLToPath(import.meta.url) === entry) {
  main().catch((error) => {
    writeErr(error && error.message ? error.message : String(error));
    process.exit(error && error.exitCode ? error.exitCode : 1);
  });
}
