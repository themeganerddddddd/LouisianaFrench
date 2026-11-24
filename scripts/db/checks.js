'use strict';

const { spawn } = require('node:child_process');
const config = require('../release/config');

const SUPABASE_CLI_VERSION = '3.3.0';

function projectRefs(source = config) {
  return {
    dev: refFromHost(source.supabaseHosts.preview),
    prod: refFromHost(source.supabaseHosts.production)
  };
}

function refFromHost(host) {
  const ref = String(host || '').split('.')[0];
  if (!ref) throw new Error('config.js is missing a Supabase project ref.');
  return ref;
}

function parseDotEnv(text) {
  const out = {};
  for (const rawLine of String(text ?? '').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const body = line.startsWith('export ') ? line.slice('export '.length).trim() : line;
    const eq = body.indexOf('=');
    if (eq <= 0) continue;
    const key = body.slice(0, eq).trim();
    let value = body.slice(eq + 1).trim();
    const quoted = (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"));
    if (quoted && value.length >= 2) value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}

function resolveDatabaseUrl({ env, processEnv, fileText }) {
  if (env !== 'dev' && env !== 'prod') {
    throw new Error('Target --env must be dev or prod.');
  }
  const key = env === 'prod' ? 'SUPABASE_DB_URL_PROD' : 'SUPABASE_DB_URL_DEV';
  if (processEnv[key]) return processEnv[key];
  const fromFile = parseDotEnv(fileText || '')[key];
  if (fromFile) return fromFile;
  throw new Error(`Missing ${key}. Set it in the environment or in .env.db.local.`);
}

function assertTarget({ env, url, confirm, refs }) {
  const expectedRefs = refs || projectRefs(config);
  if (env !== 'dev' && env !== 'prod') {
    throw new Error('Target --env must be dev or prod.');
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Database URL is not a valid postgres URL.');
  }
  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new Error('Database URL must use the postgres protocol.');
  }
  const port = parsed.port;
  if (port === '6543') {
    throw new Error('Transaction pooler port 6543 cannot run migrations. Use port 5432 on the same host.');
  }
  if (port !== '5432') {
    throw new Error(`Refusing port ${port || '(none)'}. Migrations need the session pooler on port 5432.`);
  }
  const username = parsed.username;
  if (!username.startsWith('postgres.') || username.length === 'postgres.'.length) {
    throw new Error('Database URL username must be postgres.<project ref> (the session pooler user).');
  }
  const ref = username.slice('postgres.'.length);
  const expected = expectedRefs[env];
  if (ref !== expected) {
    throw new Error(`Database URL project ref ${ref} does not match ${env} (${expected}).`);
  }
  if (env === 'prod' && confirm !== expected) {
    throw new Error(`Prod needs --confirm ${expected}.`);
  }
  return { ref, port, host: parsed.hostname, username };
}

function redact(text, secrets = {}) {
  const needles = [];
  const add = (value) => {
    if (typeof value === 'string' && value.length > 0) needles.push(value);
  };
  add(secrets.url);
  add(secrets.password);
  if (typeof secrets.password === 'string' && secrets.password.length > 0) {
    add(encodeURIComponent(secrets.password));
  }
  let out = String(text ?? '');
  for (const needle of [...new Set(needles)].sort((a, b) => b.length - a.length)) {
    out = out.split(needle).join('[redacted]');
  }
  return out;
}

function formatCommand(cmd, args, secrets) {
  return redact([cmd, ...(args || [])].join(' '), secrets);
}

function parseMigrationFileName(file) {
  const match = /^(\d{14})_(.+)\.sql$/.exec(file);
  if (!match) return null;
  return { version: match[1], name: match[2], file };
}

function cmpVersion(a, b) {
  const left = String(a).padStart(32, '0');
  const right = String(b).padStart(32, '0');
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

// Returned for a person to run by hand. This module never executes the statement.
function fixupSql(fileVersion, stamped, name) {
  return `update supabase_migrations.schema_migrations set version=${sqlLiteral(fileVersion)} where version=${sqlLiteral(stamped)} and name=${sqlLiteral(name)};`;
}

function checkHistory(local, remote) {
  const blocks = [];
  const localByVersion = new Map();
  const localByName = new Map();
  for (const row of local) {
    if (localByVersion.has(row.version)) {
      blocks.push({ kind: 'duplicate-local-version', version: row.version, name: row.name });
    }
    localByVersion.set(row.version, row);
    if (row.name && localByName.has(row.name)) {
      blocks.push({ kind: 'duplicate-local-name', version: row.version, name: row.name });
    }
    if (row.name) localByName.set(row.name, row);
  }

  const mismatchedNames = new Set();
  const remoteVersions = new Set();
  for (const row of remote) {
    remoteVersions.add(row.version);
    const sameVersion = localByVersion.get(row.version);
    if (sameVersion) {
      if (sameVersion.name !== row.name) {
        blocks.push({
          kind: 'name-differs',
          version: row.version,
          localName: sameVersion.name,
          remoteName: row.name
        });
      }
      continue;
    }
    const sameName = row.name ? localByName.get(row.name) : undefined;
    if (sameName && sameName.version !== row.version) {
      mismatchedNames.add(row.name);
      blocks.push({
        kind: 'version-mismatch',
        name: row.name,
        localVersion: sameName.version,
        remoteVersion: row.version,
        sql: fixupSql(sameName.version, row.version, row.name)
      });
      continue;
    }
    blocks.push({ kind: 'remote-only', version: row.version, name: row.name });
  }

  let maxRemote = '';
  for (const version of remoteVersions) {
    if (!maxRemote || cmpVersion(version, maxRemote) > 0) maxRemote = version;
  }

  const pending = [];
  for (const row of local) {
    if (remoteVersions.has(row.version) || mismatchedNames.has(row.name)) continue;
    pending.push({ version: row.version, name: row.name });
    if (maxRemote && cmpVersion(row.version, maxRemote) < 0) {
      blocks.push({ kind: 'out-of-order', version: row.version, name: row.name });
    }
  }

  return { ok: blocks.length === 0, blocks, pending };
}

function pushCommand(dbUrl, { dryRun, workdir }) {
  const args = [
    '--yes',
    `supabase@${SUPABASE_CLI_VERSION}`,
    '--yes',
    '--agent=no',
    'db',
    'push',
    '--skip-vault',
    `--workdir=${workdir}`,
    `--remote=${dbUrl}`
  ];
  if (dryRun) args.push('--dry-run');
  return { cmd: 'npx', args, label: dryRun ? 'dry-run' : 'push' };
}

function historyCommand(dbUrl) {
  return {
    cmd: 'psql',
    args: [
      dbUrl,
      '-X',
      '-v', 'ON_ERROR_STOP=1',
      '-v', 'VERBOSITY=verbose',
      '-At',
      '-F', '|',
      '-c', "select version, coalesce(name, '') from supabase_migrations.schema_migrations order by version"
    ],
    label: 'history'
  };
}

function verifyCommand(dbUrl, verifyPath) {
  return {
    cmd: 'psql',
    args: [
      dbUrl,
      '-X',
      '-v', 'ON_ERROR_STOP=1',
      '-c', 'set default_transaction_read_only = on',
      '-f', verifyPath
    ],
    label: 'verify'
  };
}

function commandsFor({ command, dbUrl, workdir, verifyPath }) {
  if (command === 'plan') return [pushCommand(dbUrl, { dryRun: true, workdir })];
  if (command === 'apply') {
    return [
      pushCommand(dbUrl, { dryRun: true, workdir }),
      pushCommand(dbUrl, { dryRun: false, workdir }),
      verifyCommand(dbUrl, verifyPath)
    ];
  }
  if (command === 'verify') return [verifyCommand(dbUrl, verifyPath)];
  if (command === 'status') return [historyCommand(dbUrl)];
  throw new Error(`Unknown command ${command}`);
}

async function runSteps({ history, commands, run }) {
  if (!history.ok) return { code: 1, ran: [] };
  const ran = [];
  for (const command of commands) {
    ran.push(command);
    const result = await run(command);
    if (!result || result.code !== 0) return { code: result ? result.code : 1, ran };
  }
  return { code: 0, ran };
}

function scrubbedEnv() {
  const env = { ...process.env, PGCONNECT_TIMEOUT: '15', LC_ALL: 'C' };
  delete env.SUPABASE_DB_URL_DEV;
  delete env.SUPABASE_DB_URL_PROD;
  delete env.PGPASSWORD;
  return env;
}

function runCaptured(cmd, args, secrets) {
  return new Promise((resolve) => {
    let settled = false;
    const out = [];
    const err = [];
    const finish = (code) => {
      if (settled) return;
      settled = true;
      resolve({
        code: code == null ? 1 : code,
        stdout: redact(out.join(''), secrets),
        stderr: redact(err.join(''), secrets)
      });
    };
    const child = spawn(cmd, args, {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: scrubbedEnv()
    });
    child.stdout.on('data', (chunk) => out.push(String(chunk)));
    child.stderr.on('data', (chunk) => err.push(String(chunk)));
    child.on('error', (error) => {
      const message = error && error.code === 'ENOENT'
        ? `Could not run ${cmd}. Install it and try again.`
        : (error && error.message) || 'Command failed to start.';
      err.push(message);
      finish(1);
    });
    child.on('close', (code) => finish(code));
  });
}

function parseHistoryTuples(text) {
  const rows = [];
  for (const line of String(text ?? '').split('\n')) {
    if (!line.trim()) continue;
    const bar = line.indexOf('|');
    if (bar === -1) throw new Error('Could not read migration history.');
    rows.push({ version: line.slice(0, bar), name: line.slice(bar + 1) });
  }
  return rows;
}

function missingHistory(stderr) {
  const text = String(stderr ?? '');
  if (/\b42P01\b/.test(text) || /\b3F000\b/.test(text)) return true;
  return /does not exist/i.test(text) && /schema_migrations|supabase_migrations/i.test(text);
}

function parseArgs(argv) {
  const usage = 'Usage: node scripts/db/migrate.mjs <status|plan|apply|verify> --env dev|prod [--confirm <prod-ref>]';
  const fail = (message) => {
    const error = new Error(message);
    error.exitCode = 2;
    throw error;
  };
  const command = argv[0];
  if (!['status', 'plan', 'apply', 'verify'].includes(command)) fail(usage);
  let env;
  let confirm;
  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--env' || arg.startsWith('--env=')) {
      env = arg === '--env' ? argv[++i] : arg.slice('--env='.length);
      if (!env) fail('--env needs a value.');
    } else if (arg === '--confirm' || arg.startsWith('--confirm=')) {
      confirm = arg === '--confirm' ? argv[++i] : arg.slice('--confirm='.length);
      if (!confirm) fail('--confirm needs a value.');
    } else {
      fail(`Unknown argument ${arg}. ${usage}`);
    }
  }
  if (env !== 'dev' && env !== 'prod') fail('Target --env must be dev or prod.');
  return { command, env, confirm };
}

function formatHistory(history) {
  const lines = [history.ok ? 'history ok' : 'history stopped'];
  for (const block of history.blocks) {
    if (block.kind === 'remote-only') {
      lines.push(`remote-only version ${block.version} (${block.name})`);
    } else if (block.kind === 'version-mismatch') {
      lines.push(`same name under a different version: ${block.name} file ${block.localVersion} remote ${block.remoteVersion}`);
      lines.push('fix-up SQL (not run):');
      lines.push(block.sql);
    } else if (block.kind === 'out-of-order') {
      lines.push(`out-of-order pending file ${block.version}_${block.name}.sql`);
    } else if (block.kind === 'name-differs') {
      lines.push(`version ${block.version} is named ${block.remoteName} on the remote and ${block.localName} in the file`);
    } else if (block.kind === 'bad-filename') {
      lines.push(`local file ${block.file} does not match <version>_<name>.sql`);
    } else {
      lines.push(`${block.kind} ${block.version || ''} ${block.name || ''}`.trim());
    }
  }
  for (const row of history.pending) lines.push(`pending ${row.version} ${row.name}`);
  return lines.join('\n');
}

module.exports = {
  SUPABASE_CLI_VERSION,
  parseDotEnv,
  resolveDatabaseUrl,
  projectRefs,
  assertTarget,
  redact,
  formatCommand,
  parseMigrationFileName,
  checkHistory,
  pushCommand,
  historyCommand,
  verifyCommand,
  commandsFor,
  runSteps,
  runCaptured,
  parseHistoryTuples,
  missingHistory,
  parseArgs,
  formatHistory
};
